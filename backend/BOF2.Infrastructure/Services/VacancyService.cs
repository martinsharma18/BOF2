using BOF2.Application.Common;
using BOF2.Application.Vacancies;
using BOF2.Domain.Entities;
using BOF2.Domain.Enums;
using BOF2.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BOF2.Infrastructure.Services;

public class VacancyService(
    AppDbContext db,
    IValidator<VacancyRequest> validator,
    IValidator<VacancyApplyRequest> applyValidator,
    ICurrentUser currentUser,
    IFileStorage fileStorage) : IVacancyService
{
    private const string CvFolder = "vacancy-cvs";
    private const string CvField = "Cv";

    public async Task<IReadOnlyList<VacancyDto>> GetOpenAsync(int count, CancellationToken ct = default)
    {
        var today = Age.Today;
        var vacancies = await db.Vacancies.AsNoTracking()
            .Where(v => v.IsActive && (v.Deadline == null || v.Deadline >= today))
            .OrderByDescending(v => v.CreatedAt)
            .Take(Math.Clamp(count, 1, 20))
            .ToListAsync(ct);
        return vacancies.Select(ToDto).ToList();
    }

    public async Task<IReadOnlyList<VacancyDto>> ListAllAsync(CancellationToken ct = default)
    {
        var vacancies = await db.Vacancies.AsNoTracking().OrderByDescending(v => v.CreatedAt).ToListAsync(ct);
        var counts = await db.VacancyApplications.AsNoTracking()
            .GroupBy(a => a.VacancyId)
            .Select(g => new { VacancyId = g.Key, All = g.Count(), Pending = g.Count(a => a.Status == VacancyApplicationStatus.Pending) })
            .ToDictionaryAsync(x => x.VacancyId, ct);
        return vacancies.Select(v => ToDto(v) with
        {
            ApplicationCount = counts.TryGetValue(v.Id, out var c) ? c.All : 0,
            PendingApplicationCount = counts.TryGetValue(v.Id, out var p) ? p.Pending : 0,
        }).ToList();
    }

    public async Task<VacancyDto> CreateAsync(VacancyRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        var vacancy = new Vacancy();
        Apply(vacancy, request);
        db.Vacancies.Add(vacancy);
        await AnnounceIfLiveAsync(vacancy, ct);
        await db.SaveChangesAsync(ct);
        return ToDto(vacancy);
    }

    public async Task<VacancyDto> UpdateAsync(Guid id, VacancyRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        var vacancy = await FindAsync(id, ct);
        Apply(vacancy, request);
        await AnnounceIfLiveAsync(vacancy, ct);
        await db.SaveChangesAsync(ct);
        return ToDto(vacancy);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var cvs = await db.VacancyApplications.Where(a => a.VacancyId == id).Select(a => a.CvUrl).ToListAsync(ct);
        db.Vacancies.Remove(await FindAsync(id, ct));
        await db.SaveChangesAsync(ct);
        // Applications go with the vacancy (cascade); remove their CV files too.
        foreach (var url in cvs)
            await fileStorage.DeleteAsync(url, ct);
    }

    public async Task<MyVacancyApplicationDto> ApplyAsync(Guid vacancyId, VacancyApplyRequest request, FileUpload? cv, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await applyValidator.ValidateAndThrowAsync(request, ct);
        if (cv is null)
            throw new FieldErrorsException(new Dictionary<string, string[]> { [CvField] = ["Add your CV as a photo or PDF."] });
        ImageRules.EnsureValidImageOrPdf(cv, CvField);

        var vacancy = await db.Vacancies.AsNoTracking().FirstOrDefaultAsync(v => v.Id == vacancyId, ct)
                      ?? throw new NotFoundException("Vacancy not found.");
        if (!vacancy.IsActive || (vacancy.Deadline is { } deadline && deadline < Age.Today))
            throw new FieldErrorsException(new Dictionary<string, string[]> { [CvField] = ["This vacancy is closed."] });
        if (await db.VacancyApplications.AnyAsync(a => a.VacancyId == vacancyId && a.ApplicantId == userId, ct))
            throw AlreadyApplied();

        var cvUrl = await fileStorage.SaveAsync(cv, CvFolder, ct);
        var fileName = Path.GetFileName(cv.FileName) is { Length: > 0 } n ? n[..Math.Min(n.Length, 200)] : "cv";
        var application = new VacancyApplication
        {
            VacancyId = vacancyId,
            ApplicantId = userId,
            CvUrl = cvUrl,
            CvFileName = fileName,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
        };
        db.VacancyApplications.Add(application);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            await fileStorage.DeleteAsync(cvUrl, CancellationToken.None);
            if (ex is DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } })
                throw AlreadyApplied(); // double tap
            throw;
        }

        return new MyVacancyApplicationDto(application.Id, application.Status, application.CreatedAt);
    }

    public async Task<MyVacancyApplicationDto?> GetMineAsync(Guid vacancyId, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        return await db.VacancyApplications.AsNoTracking()
            .Where(a => a.VacancyId == vacancyId && a.ApplicantId == userId)
            .Select(a => new MyVacancyApplicationDto(a.Id, a.Status, a.CreatedAt))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<PagedResult<VacancyApplicationDto>> ListApplicationsAsync(VacancyApplicationQuery query, CancellationToken ct = default)
    {
        var applications = db.VacancyApplications.AsNoTracking();
        if (query.VacancyId is { } vacancyId)
            applications = applications.Where(a => a.VacancyId == vacancyId);
        if (query.Status is { } status)
            applications = applications.Where(a => a.Status == status);

        var total = await applications.CountAsync(ct);
        var items = await applications
            .OrderByDescending(a => a.CreatedAt)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .Select(ToApplicationDto)
            .ToListAsync(ct);
        return new PagedResult<VacancyApplicationDto>(items, query.Page, query.PageSize, total);
    }

    public async Task<VacancyApplicationDto> SetApplicationStatusAsync(Guid applicationId, VacancyApplicationStatus status, CancellationToken ct = default)
    {
        if (!Enum.IsDefined(status))
            throw new FieldErrorsException(new Dictionary<string, string[]> { ["Status"] = ["Unknown status."] });

        var application = await db.VacancyApplications.Include(a => a.Vacancy).FirstOrDefaultAsync(a => a.Id == applicationId, ct)
                          ?? throw new NotFoundException("Application not found.");
        if (application.Status != status)
        {
            application.Status = status;
            application.ReviewedAt = status == VacancyApplicationStatus.Pending ? null : DateTime.UtcNow;

            var title = application.Vacancy.Title;
            if (status == VacancyApplicationStatus.Accepted)
                db.Notify(application.ApplicantId, NotificationType.VacancyApplicationAccepted,
                    $"Your application for \"{title}\" was accepted",
                    $"{application.Vacancy.Organization} will contact you with the next steps.", "/inbox");
            else if (status == VacancyApplicationStatus.Rejected)
                db.Notify(application.ApplicantId, NotificationType.VacancyApplicationRejected,
                    $"Your application for \"{title}\" was not selected",
                    "Thank you for applying. Keep an eye on new vacancies.", "/inbox");

            await db.SaveChangesAsync(ct);
        }

        return await db.VacancyApplications.AsNoTracking().Where(a => a.Id == applicationId).Select(ToApplicationDto).FirstAsync(ct);
    }

    private static readonly System.Linq.Expressions.Expression<Func<VacancyApplication, VacancyApplicationDto>> ToApplicationDto = a =>
        new VacancyApplicationDto(
            a.Id, a.VacancyId, a.Vacancy.Title,
            a.ApplicantId, a.Applicant.FullName, a.Applicant.Email!, a.Applicant.PhoneNumber, a.Applicant.AvatarUrl,
            a.CvUrl, a.CvFileName, a.Note, a.Status, a.CreatedAt, a.ReviewedAt);

    private static FieldErrorsException AlreadyApplied() =>
        new(new Dictionary<string, string[]> { [CvField] = ["You have already applied to this vacancy."] });

    /// <summary>Sends the vacancy to every active individual's inbox, once, when it is first visible.</summary>
    private async Task AnnounceIfLiveAsync(Vacancy vacancy, CancellationToken ct)
    {
        if (vacancy.AnnouncedAt is not null || !vacancy.IsActive || (vacancy.Deadline is { } d && d < Age.Today))
            return;

        var recipients = await db.Users
            .Where(u => u.AccountType == AccountType.Individual && !u.IsDisabled)
            .Select(u => u.Id)
            .ToListAsync(ct);
        db.InboxItems.AddRange(recipients.Select(userId => new InboxItem
        {
            UserId = userId,
            Kind = InboxItemKind.Vacancy,
            VacancyId = vacancy.Id,
        }));
        vacancy.AnnouncedAt = DateTime.UtcNow;
    }

    private async Task<Vacancy> FindAsync(Guid id, CancellationToken ct) =>
        await db.Vacancies.FirstOrDefaultAsync(v => v.Id == id, ct) ?? throw new NotFoundException("Vacancy not found.");

    private static void Apply(Vacancy v, VacancyRequest r)
    {
        v.Title = r.Title.Trim();
        v.Organization = r.Organization.Trim();
        v.Location = r.Location.Trim();
        v.Description = r.Description.Trim();
        v.HowToApply = string.IsNullOrWhiteSpace(r.HowToApply) ? null : r.HowToApply.Trim();
        v.Deadline = r.Deadline;
        v.IsActive = r.IsActive;
    }

    private static VacancyDto ToDto(Vacancy v) =>
        new(v.Id, v.Title, v.Organization, v.Location, v.Description, v.HowToApply, v.Deadline, v.IsActive, v.CreatedAt);
}

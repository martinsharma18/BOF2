using BOF2.Application.Common;
using BOF2.Application.Vacancies;
using BOF2.Domain.Entities;
using BOF2.Domain.Enums;
using BOF2.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace BOF2.Infrastructure.Services;

public class VacancyService(AppDbContext db, IValidator<VacancyRequest> validator) : IVacancyService
{
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
        return vacancies.Select(ToDto).ToList();
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
        db.Vacancies.Remove(await FindAsync(id, ct));
        await db.SaveChangesAsync(ct);
    }

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

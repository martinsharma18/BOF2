using System.Linq.Expressions;
using Feedora.Application.Applications;
using Feedora.Application.Common;
using Feedora.Domain.Entities;
using Feedora.Domain.Enums;
using Feedora.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Feedora.Infrastructure.Services;

public class ApplicationService(
    AppDbContext db,
    ICurrentUser currentUser,
    IValidator<ApplyRequest> applyValidator,
    IValidator<UpdateApplicationStatusRequest> statusValidator,
    IValidator<SendMessageRequest> messageValidator,
    IValidator<PayApplicantRequest> payValidator,
    IValidator<ClaimPaymentRequest> claimValidator) : IApplicationService
{
    private const string DefaultClaimMessage = "I would like to claim this opportunity.";

    private static readonly Expression<Func<PostApplication, ApplicationDto>> ToDto = a => new ApplicationDto(
        a.Id,
        a.PostId,
        a.Post.Title,
        a.Post.MaximumPayment,
        a.Kind,
        a.Status,
        a.Message,
        a.CreatedAt,
        a.UpdatedAt,
        new ApplicantDto(
            a.Applicant.Id,
            a.Applicant.FullName,
            a.Applicant.AvatarUrl,
            a.Applicant.IndividualProfile != null ? (Gender?)a.Applicant.IndividualProfile.Gender : null,
            a.Applicant.IndividualProfile != null ? a.Applicant.IndividualProfile.Province : null,
            a.Applicant.IndividualProfile != null ? a.Applicant.IndividualProfile.District : null,
            a.Applicant.Email,
            a.Applicant.PhoneNumber,
            a.Applicant.IndividualProfile != null ? a.Applicant.IndividualProfile.AdditionalPhoneNumber : null,
            a.Applicant.IndividualProfile != null ? a.Applicant.IndividualProfile.SocialMediaLink : null,
            a.Applicant.Bio,
            a.Applicant.CreatedAt),
        new AuthorDto(
            a.Post.Author.Id,
            a.Post.Author.FullName,
            a.Post.Author.AccountType,
            a.Post.Author.CompanyProfile != null ? a.Post.Author.CompanyProfile.CompanyName : null,
            a.Post.Author.AvatarUrl),
        a.Messages.Count,
        a.Payments.Sum(p => (decimal?)p.Amount) ?? 0,
        a.ClaimedAmount,
        a.ClaimNote,
        a.ClaimedAt);

    public async Task<ApplicationDto> ApplyAsync(Guid postId, ApplyRequest request, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await applyValidator.ValidateAndThrowAsync(request, ct);

        var post = await db.Posts.AsNoTracking()
                       .Where(p => p.Id == postId)
                       .Select(p => new { p.AuthorId, p.Title })
                       .FirstOrDefaultAsync(ct)
                   ?? throw new NotFoundException("Post not found.");
        if (post.AuthorId == userId)
            throw new ForbiddenException("You cannot apply to your own post.");

        if (await db.Applications.AnyAsync(a => a.PostId == postId && a.ApplicantId == userId, ct))
            throw AlreadyApplied();

        var applicantName = await db.Users.Where(u => u.Id == userId).Select(u => u.FullName).FirstAsync(ct);
        var application = new PostApplication
        {
            PostId = postId,
            ApplicantId = userId,
            Kind = request.Kind,
            Message = string.IsNullOrWhiteSpace(request.Message) ? DefaultClaimMessage : request.Message.Trim(),
        };
        db.Applications.Add(application);
        db.Notify(post.AuthorId, NotificationType.ApplicationReceived,
            request.Kind == ApplicationKind.Claim
                ? $"{applicantName} claimed \"{post.Title}\""
                : $"{applicantName} applied to \"{post.Title}\"",
            application.Message,
            Link(application.Id));

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw AlreadyApplied(); // double click / parallel request
        }

        return await GetAsync(application.Id, ct);
    }

    public async Task<PagedResult<ApplicationDto>> ListAsync(ApplicationQuery query, CancellationToken ct = default)
    {
        var applications = VisibleToMe(currentUser.RequireUserId());

        if (query.PostId is { } postId)
            applications = applications.Where(a => a.PostId == postId);
        if (query.Status is { } status)
            applications = applications.Where(a => a.Status == status);

        var total = await applications.CountAsync(ct);
        var items = await applications
            .OrderByDescending(a => a.CreatedAt)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .Select(ToDto)
            .ToListAsync(ct);

        return new PagedResult<ApplicationDto>(items, query.Page, query.PageSize, total);
    }

    public async Task<ApplicationDto> GetAsync(Guid id, CancellationToken ct = default) =>
        await VisibleToMe(currentUser.RequireUserId()).Where(a => a.Id == id).Select(ToDto).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Application not found.");

    public async Task<ApplicationDto> UpdateStatusAsync(Guid id, UpdateApplicationStatusRequest request, CancellationToken ct = default)
    {
        await statusValidator.ValidateAndThrowAsync(request, ct);
        var application = await LoadAsCompanyAsync(id, ct);

        if (application.Status != request.Status)
        {
            application.Status = request.Status;
            application.UpdatedAt = DateTime.UtcNow;

            var company = await CompanyNameAsync(application.Post.AuthorId, ct);
            if (request.Status == ApplicationStatus.Accepted)
                db.Notify(application.ApplicantId, NotificationType.ApplicationAccepted,
                    $"{company} accepted your application", application.Post.Title, Link(id));
            else if (request.Status == ApplicationStatus.Rejected)
                db.Notify(application.ApplicantId, NotificationType.ApplicationRejected,
                    $"{company} declined your application", application.Post.Title, Link(id));

            await db.SaveChangesAsync(ct);
        }

        return await GetAsync(id, ct);
    }

    public async Task<IReadOnlyList<ApplicationMessageDto>> ListMessagesAsync(Guid id, CancellationToken ct = default)
    {
        await EnsureParticipantAsync(id, ct);

        var messages = await db.ApplicationMessages.AsNoTracking()
            .Where(m => m.ApplicationId == id)
            .OrderBy(m => m.CreatedAt)
            .Take(500)
            .ToListAsync(ct);

        var senders = await db.LoadAuthorsAsync(messages.Select(m => m.SenderId), ct);
        return messages.Select(m => new ApplicationMessageDto(m.Id, m.ApplicationId, m.Content, m.CreatedAt, senders[m.SenderId])).ToList();
    }

    public async Task<ApplicationMessageDto> SendMessageAsync(Guid id, SendMessageRequest request, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await messageValidator.ValidateAndThrowAsync(request, ct);
        var (applicantId, companyId, postTitle) = await EnsureParticipantAsync(id, ct);

        var message = new ApplicationMessage { ApplicationId = id, SenderId = userId, Content = request.Content.Trim() };
        db.ApplicationMessages.Add(message);

        var senders = await db.LoadAuthorsAsync([userId], ct);
        var sender = senders[userId];
        db.Notify(userId == applicantId ? companyId : applicantId, NotificationType.NewMessage,
            $"New message from {sender.DisplayName}", $"{postTitle}: {message.Content}", Link(id));

        await db.SaveChangesAsync(ct);
        return new ApplicationMessageDto(message.Id, id, message.Content, message.CreatedAt, sender);
    }

    public async Task<ApplicationDto> ClaimAsync(Guid id, ClaimPaymentRequest request, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await claimValidator.ValidateAndThrowAsync(request, ct);

        var application = await db.Applications.Include(a => a.Post).FirstOrDefaultAsync(a => a.Id == id, ct)
                          ?? throw new NotFoundException("Application not found.");
        if (application.ApplicantId != userId)
            throw new NotFoundException("Application not found.");

        string? error = null;
        if (application.Status != ApplicationStatus.Accepted)
            error = "You can claim payment once the company accepts your application.";
        else if (application.ClaimedAmount is not null)
            error = "You already have a claim waiting for the company to pay.";
        if (error is not null)
            throw new FieldErrorsException(new Dictionary<string, string[]> { ["Amount"] = [error] });

        application.ClaimedAmount = decimal.Round(request.Amount, 2);
        application.ClaimNote = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        application.ClaimedAt = DateTime.UtcNow;
        application.UpdatedAt = application.ClaimedAt;

        var name = await db.Users.Where(u => u.Id == userId).Select(u => u.FullName).FirstAsync(ct);
        db.Notify(application.Post.AuthorId, NotificationType.PaymentClaimed,
            $"{name} claimed Rs. {application.ClaimedAmount:N0} for \"{application.Post.Title}\"",
            application.ClaimNote ?? "Review and pay from Applicants.",
            Link(id));

        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<ApplicationDto> PayAsync(Guid id, PayApplicantRequest request, CancellationToken ct = default)
    {
        await payValidator.ValidateAndThrowAsync(request, ct);
        var application = await LoadAsCompanyAsync(id, ct);
        if (application.Status != ApplicationStatus.Accepted)
            throw new FieldErrorsException(new Dictionary<string, string[]>
            {
                ["Amount"] = ["Accept the application before releasing a payment."],
            });

        db.Payments.Add(new Payment
        {
            ApplicationId = id,
            PayerId = application.Post.AuthorId,
            RecipientId = application.ApplicantId,
            Amount = decimal.Round(request.Amount, 2),
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
        });

        // Paying settles the open claim, so the applicant can claim again for later work.
        application.ClaimedAmount = null;
        application.ClaimNote = null;
        application.ClaimedAt = null;

        var company = await CompanyNameAsync(application.Post.AuthorId, ct);
        db.Notify(application.ApplicantId, NotificationType.PaymentReceived,
            $"{company} paid you Rs. {request.Amount:N0}", $"For \"{application.Post.Title}\". It's now in your wallet.", "/wallet");

        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    /// <summary>Applications the user may see: sent by them, received on their posts, or all for admins.</summary>
    private IQueryable<PostApplication> VisibleToMe(Guid userId)
    {
        var applications = db.Applications.AsNoTracking();
        return currentUser.IsAdmin
            ? applications
            : applications.Where(a => a.ApplicantId == userId || a.Post.AuthorId == userId);
    }

    private async Task<PostApplication> LoadAsCompanyAsync(Guid id, CancellationToken ct)
    {
        var userId = currentUser.RequireUserId();
        var application = await db.Applications.Include(a => a.Post).FirstOrDefaultAsync(a => a.Id == id, ct)
                          ?? throw new NotFoundException("Application not found.");
        if (application.Post.AuthorId != userId)
            throw new ForbiddenException("Only the company that posted this can do that.");
        return application;
    }

    private async Task<(Guid ApplicantId, Guid CompanyId, string PostTitle)> EnsureParticipantAsync(Guid id, CancellationToken ct)
    {
        var userId = currentUser.RequireUserId();
        var info = await db.Applications.AsNoTracking()
                       .Where(a => a.Id == id)
                       .Select(a => new { a.ApplicantId, CompanyId = a.Post.AuthorId, a.Post.Title })
                       .FirstOrDefaultAsync(ct)
                   ?? throw new NotFoundException("Application not found.");
        if (info.ApplicantId != userId && info.CompanyId != userId && !currentUser.IsAdmin)
            throw new NotFoundException("Application not found.");
        return (info.ApplicantId, info.CompanyId, info.Title);
    }

    private Task<string> CompanyNameAsync(Guid userId, CancellationToken ct) =>
        db.Users.Where(u => u.Id == userId)
            .Select(u => u.CompanyProfile != null ? u.CompanyProfile.CompanyName : u.FullName)
            .FirstAsync(ct);

    private static string Link(Guid applicationId) => $"/applications?id={applicationId}";

    private static FieldErrorsException AlreadyApplied() =>
        new(new Dictionary<string, string[]> { ["Message"] = ["You have already applied to this post."] });
}

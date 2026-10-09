using System.Data;
using System.Linq.Expressions;
using BOF2.Application.Applications;
using BOF2.Application.Common;
using BOF2.Domain;
using BOF2.Domain.Entities;
using BOF2.Domain.Enums;
using BOF2.Infrastructure.Persistence;
using BOF2.Infrastructure.Push;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BOF2.Infrastructure.Services;

public class ApplicationService(
    AppDbContext db,
    ICurrentUser currentUser,
    IValidator<ApplyRequest> applyValidator,
    IValidator<UpdateApplicationStatusRequest> statusValidator,
    IValidator<SendMessageRequest> messageValidator,
    IValidator<PayApplicantRequest> payValidator,
    IValidator<ClaimPaymentRequest> claimValidator,
    IValidator<DeclineClaimRequest> declineClaimValidator,
    IFileStorage fileStorage,
    PushQueue pushQueue) : IApplicationService
{
    private const string DefaultClaimMessage = "I would like to claim this opportunity.";
    private const string NoPaymentsMessage = "This type of post has no in-app payment. Agree on payment with the company in the chat.";

    private static readonly Expression<Func<PostApplication, ApplicationDto>> ToDto = a => new ApplicationDto(
        a.Id,
        a.PostId,
        a.Post.Title,
        a.Post.Type,
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
            a.Applicant.IndividualProfile != null ? a.Applicant.IndividualProfile.LocalLevel : null,
            a.Applicant.IndividualProfile != null ? a.Applicant.IndividualProfile.DateOfBirth : null,
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
        a.ClaimedAt,
        a.ClaimAttachmentUrl,
        a.ClaimAttachmentName,
        a.ClaimDeclineReason);

    public async Task<ApplicationDto> ApplyAsync(Guid postId, ApplyRequest request, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await applyValidator.ValidateAndThrowAsync(request, ct);

        var post = await db.Posts.AsNoTracking()
                       .Where(p => p.Id == postId)
                       .Select(p => new { p.AuthorId, p.Title, p.Type, p.MinimumNumber, Applied = p.Applications.Count() })
                       .FirstOrDefaultAsync(ct)
                   ?? throw new NotFoundException("Post not found.");
        if (post.AuthorId == userId)
            throw new ForbiddenException("You cannot apply to your own post.");

        if (await db.Applications.AnyAsync(a => a.PostId == postId && a.ApplicantId == userId, ct))
            throw AlreadyApplied();

        if (PostTypeRules.ApplicationLimit(post.Type, post.MinimumNumber) is { } limit && post.Applied >= limit)
            throw new FieldErrorsException(new Dictionary<string, string[]>
            {
                ["Message"] = ["This post is full: it already has enough applications."],
            });

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
            Link(application.Id),
            actorId: userId);

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
        if (query.PostType is { } postType)
            applications = applications.Where(a => a.Post.Type == postType);
        if (query.Stage is { } stage)
            applications = stage switch
            {
                ApplicationStage.New => applications.Where(a => a.Status == ApplicationStatus.Pending),
                ApplicationStage.Hired => applications.Where(a => a.Status == ApplicationStatus.Accepted && a.ClaimedAmount == null),
                ApplicationStage.Claimed => applications.Where(a => a.Status == ApplicationStatus.Accepted && a.ClaimedAmount != null),
                ApplicationStage.Paid => applications.Where(a => a.Status == ApplicationStatus.Completed),
                _ => applications.Where(a => a.Status == ApplicationStatus.Rejected),
            };

        var total = await applications.CountAsync(ct);
        var items = await applications
            .OrderByDescending(a => a.CreatedAt)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .Select(ToDto)
            .ToListAsync(ct);

        return new PagedResult<ApplicationDto>(items, query.Page, query.PageSize, total);
    }

    public async Task<ApplicationSummaryDto> SummaryAsync(Guid? postId, CancellationToken ct = default)
    {
        var applications = VisibleToMe(currentUser.RequireUserId());
        if (postId is { } id)
            applications = applications.Where(a => a.PostId == id);

        var counts = await applications
            .GroupBy(a => new { a.Status, Claimed = a.ClaimedAmount != null })
            .Select(g => new { g.Key.Status, g.Key.Claimed, Count = g.Count() })
            .ToListAsync(ct);

        int Count(ApplicationStatus status, bool? claimed = null) =>
            counts.Where(c => c.Status == status && (claimed == null || c.Claimed == claimed)).Sum(c => c.Count);

        return new ApplicationSummaryDto(
            All: counts.Sum(c => c.Count),
            New: Count(ApplicationStatus.Pending),
            Hired: Count(ApplicationStatus.Accepted, claimed: false),
            Claimed: Count(ApplicationStatus.Accepted, claimed: true),
            Paid: Count(ApplicationStatus.Completed),
            Declined: Count(ApplicationStatus.Rejected));
    }

    public async Task<ApplicationDto> GetAsync(Guid id, CancellationToken ct = default) =>
        await VisibleToMe(currentUser.RequireUserId()).Where(a => a.Id == id).Select(ToDto).FirstOrDefaultAsync(ct)
        ?? throw new NotFoundException("Application not found.");

    public async Task<ApplicationDto> UpdateStatusAsync(Guid id, UpdateApplicationStatusRequest request, CancellationToken ct = default)
    {
        await statusValidator.ValidateAndThrowAsync(request, ct);
        var application = await LoadAsCompanyAsync(id, ct);

        string? error = null;
        if (request.Status is not (ApplicationStatus.Accepted or ApplicationStatus.Rejected))
            error = "You can only accept or decline an application.";
        else if (application.Status == ApplicationStatus.Completed)
            error = "This job is already paid and closed.";
        else if (application.ClaimedAmount is not null && request.Status == ApplicationStatus.Rejected)
            error = "The applicant has claimed payment. Pay or decline the claim first.";
        if (error is not null)
            throw new FieldErrorsException(new Dictionary<string, string[]> { ["Status"] = [error] });

        if (application.Status != request.Status)
        {
            application.Status = request.Status;
            application.UpdatedAt = DateTime.UtcNow;

            var company = await CompanyNameAsync(application.Post.AuthorId, ct);
            if (request.Status == ApplicationStatus.Accepted)
                db.Notify(application.ApplicantId, NotificationType.ApplicationAccepted,
                    $"{company} hired you",
                    application.Post.Type.UsesPayments()
                        ? $"{application.Post.Title}. When the work is done, claim your payment."
                        : $"{application.Post.Title}. Chat with them to agree on the details.",
                    Link(id), actorId: application.Post.AuthorId);
            else if (request.Status == ApplicationStatus.Rejected)
                db.Notify(application.ApplicantId, NotificationType.ApplicationRejected,
                    $"{company} chose someone else for \"{application.Post.Title}\"", "Keep applying to other jobs on the feed.", Link(id), actorId: application.Post.AuthorId);

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
        await db.SaveChangesAsync(ct);

        // Sending means you've seen the conversation up to here.
        await SetReadAsync(id, userId == applicantId, message.CreatedAt, ct);

        var sender = (await db.LoadAuthorsAsync([userId], ct))[userId];
        // Chat lives in Messages (with its own badge), not in the notification list; the phone still gets a push.
        // One tag per conversation, so a burst of messages shows as one notification.
        pushQueue.Enqueue(new PushNote(userId == applicantId ? companyId : applicantId,
            sender.DisplayName, $"{postTitle}: {message.Content}", ChatLink(id), $"chat-{id}"));

        return new ApplicationMessageDto(message.Id, id, message.Content, message.CreatedAt, sender);
    }

    public async Task<PagedResult<ChatSummaryDto>> ListChatsAsync(ChatQuery query, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        var chats = MyChats(userId);
        var total = await chats.CountAsync(ct);

        var rows = await chats
            .OrderByDescending(c => c.LastAt)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .Select(c => new
            {
                c.App.Id,
                c.App.PostId,
                c.App.Post.Title,
                c.App.Status,
                c.App.ClaimedAmount,
                c.App.ApplicantId,
                CompanyId = c.App.Post.AuthorId,
                Last = c.App.Messages.OrderByDescending(m => m.CreatedAt).Select(m => new { m.Content, m.SenderId }).FirstOrDefault(),
                c.App.Message,
                c.LastAt,
                c.Unread,
            })
            .ToListAsync(ct);

        var people = await db.LoadAuthorsAsync(rows.Select(r => r.ApplicantId == userId ? r.CompanyId : r.ApplicantId), ct);
        var items = rows.Select(r => new ChatSummaryDto(
            r.Id, r.PostId, r.Title, r.Status, r.ClaimedAmount,
            people[r.ApplicantId == userId ? r.CompanyId : r.ApplicantId],
            r.Last?.Content ?? r.Message,
            (r.Last?.SenderId ?? r.ApplicantId) == userId,
            r.LastAt,
            r.Unread)).ToList();

        return new PagedResult<ChatSummaryDto>(items, query.Page, query.PageSize, total);
    }

    public Task<int> UnreadChatCountAsync(CancellationToken ct = default) =>
        MyChats(currentUser.RequireUserId()).CountAsync(c => c.Unread > 0, ct);

    public async Task MarkChatReadAsync(Guid id, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        var (applicantId, _, _) = await EnsureParticipantAsync(id, ct);
        await SetReadAsync(id, userId == applicantId, DateTime.UtcNow, ct);
    }

    public async Task<IReadOnlyList<ApplicationPostDto>> ListPostsAsync(CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        return await db.Posts.AsNoTracking()
            .Where(p => p.AuthorId == userId && p.Applications.Any())
            .OrderByDescending(p => p.Applications.Max(a => a.CreatedAt))
            .Select(p => new ApplicationPostDto(
                p.Id,
                p.Title,
                p.Applications.Count(),
                p.Applications.Count(a => a.Status == ApplicationStatus.Pending),
                p.Applications.Count(a => a.Status == ApplicationStatus.Accepted && a.ClaimedAmount != null)))
            .Take(50)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Conversations the user takes part in (as applicant or as the posting company), with the time of the last
    /// activity and how many messages from the other side arrived after the user last opened the chat.
    /// The application message itself counts as the first message from the applicant.
    /// </summary>
    private IQueryable<ChatRow> MyChats(Guid userId) =>
        db.Applications.AsNoTracking()
            .Where(a => a.ApplicantId == userId || a.Post.AuthorId == userId)
            .Select(a => new { App = a, ReadAt = a.ApplicantId == userId ? a.ApplicantReadAt : a.CompanyReadAt })
            .Select(x => new ChatRow
            {
                App = x.App,
                LastAt = x.App.Messages.Max(m => (DateTime?)m.CreatedAt) ?? x.App.CreatedAt,
                Unread = x.App.Messages.Count(m => m.SenderId != userId && (x.ReadAt == null || m.CreatedAt > x.ReadAt))
                         + (x.App.ApplicantId != userId && x.ReadAt == null ? 1 : 0),
            });

    private sealed class ChatRow
    {
        public PostApplication App { get; init; } = null!;
        public DateTime LastAt { get; init; }
        public int Unread { get; init; }
    }

    private Task SetReadAsync(Guid id, bool asApplicant, DateTime at, CancellationToken ct) =>
        asApplicant
            ? db.Applications.Where(a => a.Id == id).ExecuteUpdateAsync(s => s.SetProperty(a => a.ApplicantReadAt, at), ct)
            : db.Applications.Where(a => a.Id == id).ExecuteUpdateAsync(s => s.SetProperty(a => a.CompanyReadAt, at), ct);

    public async Task<ApplicationDto> ClaimAsync(Guid id, ClaimPaymentRequest request, FileUpload? proof, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await claimValidator.ValidateAndThrowAsync(request, ct);
        if (proof is not null) ImageRules.EnsureValidImageOrPdf(proof, "Proof");

        var application = await db.Applications.Include(a => a.Post).FirstOrDefaultAsync(a => a.Id == id, ct)
                          ?? throw new NotFoundException("Application not found.");
        if (application.ApplicantId != userId)
            throw new NotFoundException("Application not found.");

        // One open claim per job: only while hired, and only if nothing is claimed or paid yet.
        string? error = null;
        if (!application.Post.Type.UsesPayments())
            error = NoPaymentsMessage;
        else if (application.Status == ApplicationStatus.Completed)
            error = "This job is already paid.";
        else if (application.Status != ApplicationStatus.Accepted)
            error = "You can claim payment once the company hires you.";
        else if (application.ClaimedAmount is not null)
            error = "You have already claimed payment for this job. Wait for the company to pay or decline it.";
        else if (application.Post.MaximumPayment > 0 && request.Amount > application.Post.MaximumPayment)
            error = $"The most this post pays is Rs. {application.Post.MaximumPayment:N0}.";
        if (error is not null)
            throw AmountError(error);

        var amount = decimal.Round(request.Amount, 2);
        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        var now = DateTime.UtcNow;
        var proofUrl = proof is null ? null : await fileStorage.SaveAsync(proof, "claims", ct);
        var proofName = proof is null ? null : Path.GetFileName(proof.FileName) is { Length: > 0 } n ? n[..Math.Min(n.Length, 200)] : "proof";

        // Conditional update so a double tap can't claim twice.
        var updated = await db.Applications
            .Where(a => a.Id == id && a.Status == ApplicationStatus.Accepted && a.ClaimedAmount == null)
            .ExecuteUpdateAsync(u => u
                .SetProperty(a => a.ClaimedAmount, amount)
                .SetProperty(a => a.ClaimNote, note)
                .SetProperty(a => a.ClaimedAt, now)
                .SetProperty(a => a.ClaimAttachmentUrl, proofUrl)
                .SetProperty(a => a.ClaimAttachmentName, proofName)
                .SetProperty(a => a.ClaimDeclineReason, (string?)null)
                .SetProperty(a => a.UpdatedAt, now), ct);
        if (updated == 0)
        {
            await fileStorage.DeleteAsync(proofUrl, ct);
            throw AmountError("You have already claimed payment for this job.");
        }

        var name = await db.Users.Where(u => u.Id == userId).Select(u => u.FullName).FirstAsync(ct);
        if (PaymentRules.CompanyPaysClaims)
        {
            db.Notify(application.Post.AuthorId, NotificationType.PaymentClaimed,
                $"{name} claimed Rs. {amount:N0} for \"{application.Post.Title}\"",
                note ?? "Check the work, then pay or decline the claim from Applicants.",
                Link(id),
                actorId: userId);
        }
        else
        {
            db.Notify(application.Post.AuthorId, NotificationType.PaymentClaimed,
                $"{name} claimed Rs. {amount:N0} for \"{application.Post.Title}\"",
                "The admin will check it and pay them.",
                Link(id),
                actorId: userId);
            var adminIds = await db.Users.Where(u => u.AccountType == AccountType.Admin && !u.IsDisabled).Select(u => u.Id).ToListAsync(ct);
            foreach (var adminId in adminIds)
                db.Notify(adminId, NotificationType.PaymentClaimed,
                    $"{name} claimed Rs. {amount:N0} for \"{application.Post.Title}\"",
                    note ?? "Check the proof, then pay or decline the claim.",
                    "/admin/claims",
                    actorId: userId);
        }

        await db.SaveChangesAsync(ct);
        return await GetAsync(id, ct);
    }

    public async Task<ApplicationDto> DeclineClaimAsync(Guid id, DeclineClaimRequest request, CancellationToken ct = default)
    {
        await declineClaimValidator.ValidateAndThrowAsync(request, ct);
        var application = await LoadAsPayerAsync(id, ct);
        if (application.Status != ApplicationStatus.Accepted || application.ClaimedAmount is null)
            throw new FieldErrorsException(new Dictionary<string, string[]> { ["Reason"] = ["There is no claim waiting on this job."] });

        var claimed = application.ClaimedAmount.Value;
        var oldProof = application.ClaimAttachmentUrl;
        application.ClaimedAmount = null;
        application.ClaimNote = null;
        application.ClaimedAt = null;
        application.ClaimAttachmentUrl = null;
        application.ClaimAttachmentName = null;
        application.ClaimDeclineReason = request.Reason.Trim();
        application.UpdatedAt = DateTime.UtcNow;

        var decidedBy = currentUser.IsAdmin ? "The admin" : await CompanyNameAsync(application.Post.AuthorId, ct);
        db.Notify(application.ApplicantId, NotificationType.ClaimDeclined,
            $"{decidedBy} declined your claim of Rs. {claimed:N0}",
            $"{application.ClaimDeclineReason} You can fix it and claim again.",
            Link(id),
            actorId: currentUser.RequireUserId());

        await db.SaveChangesAsync(ct);
        await fileStorage.DeleteAsync(oldProof, ct);
        return await GetAsync(id, ct);
    }

    public async Task<ApplicationDto> PayAsync(Guid id, PayApplicantRequest request, CancellationToken ct = default)
    {
        await payValidator.ValidateAndThrowAsync(request, ct);
        var application = await LoadAsPayerAsync(id, ct);

        string? error = null;
        if (!application.Post.Type.UsesPayments())
            error = NoPaymentsMessage;
        else if (application.Status == ApplicationStatus.Completed)
            error = "This job is already paid.";
        else if (application.Status != ApplicationStatus.Accepted)
            error = "Hire the applicant before paying them.";
        else if (application.ClaimedAmount is null)
            error = "Wait for the applicant to claim payment. You'll be notified.";
        if (error is not null)
            throw AmountError(error);

        var amount = application.ClaimedAmount!.Value;
        var companyId = application.Post.AuthorId;

        // Serializable + conditional close so two taps on Pay can never create two payments.
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            var closed = await db.Applications
                .Where(a => a.Id == id && a.Status == ApplicationStatus.Accepted && a.ClaimedAmount == amount)
                .ExecuteUpdateAsync(u => u
                    .SetProperty(a => a.Status, ApplicationStatus.Completed)
                    .SetProperty(a => a.UpdatedAt, DateTime.UtcNow), ct);
            if (closed == 0)
                throw AmountError("This job was just paid or the claim changed. Refresh and check again.");

            db.Payments.Add(new Payment
            {
                ApplicationId = id,
                PayerId = companyId,
                RecipientId = application.ApplicantId,
                Amount = amount,
                Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            });

            // The payment stays on the company's job; the admin only settles it.
            var company = await CompanyNameAsync(companyId, ct);
            db.Notify(application.ApplicantId, NotificationType.PaymentReceived,
                $"You were paid Rs. {amount:N0}", $"From {company} for \"{application.Post.Title}\". It's now in your wallet.", "/wallet",
                actorId: currentUser.RequireUserId());

            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        });

        return await GetAsync(id, ct);
    }

    private IQueryable<PostApplication> VisibleToMe(Guid userId)
    {
        var applications = db.Applications.AsNoTracking();
        return currentUser.IsAdmin
            ? applications
            : applications.Where(a => a.ApplicantId == userId || a.Post.AuthorId == userId);
    }

    /// <summary>Who may pay or decline a claim: admins, and the posting company only when <see cref="PaymentRules.CompanyPaysClaims"/>.</summary>
    private async Task<PostApplication> LoadAsPayerAsync(Guid id, CancellationToken ct)
    {
        if (currentUser.IsAdmin)
            return await db.Applications.Include(a => a.Post).FirstOrDefaultAsync(a => a.Id == id, ct)
                   ?? throw new NotFoundException("Application not found.");
        if (!PaymentRules.CompanyPaysClaims)
            throw new ForbiddenException("Payment claims are paid by the admin.");
        return await LoadAsCompanyAsync(id, ct);
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

    private static string ChatLink(Guid applicationId) => $"/messages/{applicationId}";

    private static FieldErrorsException AmountError(string message) =>
        new(new Dictionary<string, string[]> { ["Amount"] = [message] });

    private static FieldErrorsException AlreadyApplied() =>
        new(new Dictionary<string, string[]> { ["Message"] = ["You have already applied to this post."] });
}

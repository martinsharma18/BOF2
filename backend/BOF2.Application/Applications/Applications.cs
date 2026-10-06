using BOF2.Application.Common;
using BOF2.Domain.Enums;
using FluentValidation;

namespace BOF2.Application.Applications;

public record ApplyRequest(ApplicationKind Kind, string? Message);

public record UpdateApplicationStatusRequest(ApplicationStatus Status);

public record SendMessageRequest(string Content);

/// <summary>The company pays exactly the claimed amount. The note is shown in the applicant's wallet.</summary>
public record PayApplicantRequest(string? Note);

/// <summary>The company turns down a claim (wrong amount, work not finished…). The applicant can claim again.</summary>
public record DeclineClaimRequest(string Reason);

/// <summary>An accepted applicant asks the company to pay them. Bound from multipart/form-data; the proof file is passed separately.</summary>
public class ClaimPaymentRequest
{
    public decimal Amount { get; set; }
    public string? Note { get; set; }
}

/// <summary>The applicant's profile as the company sees it, contact details included.</summary>
public record ApplicantDto(
    Guid Id,
    string FullName,
    string? AvatarUrl,
    Gender? Gender,
    string? Province,
    string? District,
    string? LocalLevel,
    DateOnly? DateOfBirth,
    string? Email,
    string? PhoneNumber,
    string? AdditionalPhoneNumber,
    string? SocialMediaLink,
    string? Bio,
    DateTime JoinedAt);

public record ApplicationDto(
    Guid Id,
    Guid PostId,
    string PostTitle,
    PostType PostType,
    decimal PostMaximumPayment,
    ApplicationKind Kind,
    ApplicationStatus Status,
    string Message,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    ApplicantDto Applicant,
    AuthorDto Company,
    int MessageCount,
    decimal PaidAmount,
    decimal? ClaimedAmount,
    string? ClaimNote,
    DateTime? ClaimedAt,
    string? ClaimAttachmentUrl,
    string? ClaimAttachmentName,
    string? ClaimDeclineReason);

public record ApplicationMessageDto(Guid Id, Guid ApplicationId, string Content, DateTime CreatedAt, AuthorDto Sender);

/// <summary>
/// One row in the Messages list. Every application is a conversation: it starts with the application message,
/// and <see cref="Other"/> is the person on the other side (the applicant for companies, the company for individuals).
/// </summary>
public record ChatSummaryDto(
    Guid ApplicationId,
    Guid PostId,
    string PostTitle,
    ApplicationStatus Status,
    decimal? ClaimedAmount,
    AuthorDto Other,
    string LastMessage,
    bool LastFromMe,
    DateTime LastAt,
    int Unread);

public class ChatQuery : PageQuery;

/// <summary>A company post that has applications, with counts for the "Your posts" strip.</summary>
public record ApplicationPostDto(Guid PostId, string Title, int Total, int New, int ToPay);

/// <summary>Where a job really is. "Hired" splits into Hired (working) and Claimed (waiting to be paid).</summary>
public enum ApplicationStage
{
    New = 1,
    Hired = 2,
    Claimed = 3,
    Paid = 4,
    Declined = 5
}

public class ApplicationQuery : PageQuery
{
    public Guid? PostId { get; set; }
    public ApplicationStatus? Status { get; set; }
    public ApplicationStage? Stage { get; set; }
    /// <summary>Only applications on posts of this type.</summary>
    public PostType? PostType { get; set; }
}

/// <summary>How many applications are in each stage, for the tabs and the "needs your action" banner.</summary>
public record ApplicationSummaryDto(int All, int New, int Hired, int Claimed, int Paid, int Declined);

public class ApplyValidator : AbstractValidator<ApplyRequest>
{
    public ApplyValidator()
    {
        RuleFor(x => x.Kind).IsInEnum();
        RuleFor(x => x.Message).NotEmpty().WithMessage("Write a short message for the company.")
            .When(x => x.Kind == ApplicationKind.Apply);
        RuleFor(x => x.Message).MaximumLength(1500);
    }
}

public class UpdateApplicationStatusValidator : AbstractValidator<UpdateApplicationStatusRequest>
{
    public UpdateApplicationStatusValidator()
    {
        RuleFor(x => x.Status).IsInEnum();
    }
}

public class SendMessageValidator : AbstractValidator<SendMessageRequest>
{
    public SendMessageValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(2000);
    }
}

public class PayApplicantValidator : AbstractValidator<PayApplicantRequest>
{
    public PayApplicantValidator()
    {
        RuleFor(x => x.Note).MaximumLength(200);
    }
}

public class DeclineClaimValidator : AbstractValidator<DeclineClaimRequest>
{
    public DeclineClaimValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().WithMessage("Tell them why, so they can fix the claim.").MaximumLength(300);
    }
}

public class ClaimPaymentValidator : AbstractValidator<ClaimPaymentRequest>
{
    public ClaimPaymentValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0).LessThan(10_000_000);
        RuleFor(x => x.Note).MaximumLength(200);
    }
}

public interface IApplicationService
{
    /// <summary>Individual applies to (or claims) a post. Notifies the company.</summary>
    Task<ApplicationDto> ApplyAsync(Guid postId, ApplyRequest request, CancellationToken ct = default);

    /// <summary>Company: applications on their posts. Individual: their own applications.</summary>
    Task<PagedResult<ApplicationDto>> ListAsync(ApplicationQuery query, CancellationToken ct = default);

    Task<ApplicationDto> GetAsync(Guid id, CancellationToken ct = default);

    /// <summary>Counts per stage for the signed-in user's applications (optionally one post).</summary>
    Task<ApplicationSummaryDto> SummaryAsync(Guid? postId, CancellationToken ct = default);
    Task<ApplicationDto> UpdateStatusAsync(Guid id, UpdateApplicationStatusRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<ApplicationMessageDto>> ListMessagesAsync(Guid id, CancellationToken ct = default);

    /// <summary>The signed-in user's conversations, most recent activity first.</summary>
    Task<PagedResult<ChatSummaryDto>> ListChatsAsync(ChatQuery query, CancellationToken ct = default);

    /// <summary>How many conversations have messages the user hasn't seen.</summary>
    Task<int> UnreadChatCountAsync(CancellationToken ct = default);

    Task MarkChatReadAsync(Guid id, CancellationToken ct = default);

    /// <summary>Company: its posts that have applications, with counts.</summary>
    Task<IReadOnlyList<ApplicationPostDto>> ListPostsAsync(CancellationToken ct = default);
    Task<ApplicationMessageDto> SendMessageAsync(Guid id, SendMessageRequest request, CancellationToken ct = default);

    /// <summary>Accepted applicant claims payment for their work. Notifies the company.</summary>
    Task<ApplicationDto> ClaimAsync(Guid id, ClaimPaymentRequest request, FileUpload? proof, CancellationToken ct = default);

    /// <summary>Company turns down the claim with a reason; the applicant can claim again.</summary>
    Task<ApplicationDto> DeclineClaimAsync(Guid id, DeclineClaimRequest request, CancellationToken ct = default);

    /// <summary>Company pays the claimed amount; it lands in the applicant's wallet and the job closes.</summary>
    Task<ApplicationDto> PayAsync(Guid id, PayApplicantRequest request, CancellationToken ct = default);
}

using Feedora.Application.Common;
using Feedora.Domain.Enums;
using FluentValidation;

namespace Feedora.Application.Applications;

public record ApplyRequest(ApplicationKind Kind, string? Message);

public record UpdateApplicationStatusRequest(ApplicationStatus Status);

public record SendMessageRequest(string Content);

public record PayApplicantRequest(decimal Amount, string? Note);

/// <summary>An accepted applicant asks the company to pay them.</summary>
public record ClaimPaymentRequest(decimal Amount, string? Note);

/// <summary>The applicant's profile as the company sees it, contact details included.</summary>
public record ApplicantDto(
    Guid Id,
    string FullName,
    string? AvatarUrl,
    Gender? Gender,
    string? Province,
    string? District,
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
    DateTime? ClaimedAt);

public record ApplicationMessageDto(Guid Id, Guid ApplicationId, string Content, DateTime CreatedAt, AuthorDto Sender);

public class ApplicationQuery : PageQuery
{
    public Guid? PostId { get; set; }
    public ApplicationStatus? Status { get; set; }
}

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
        RuleFor(x => x.Amount).GreaterThan(0).LessThan(10_000_000);
        RuleFor(x => x.Note).MaximumLength(200);
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
    Task<ApplicationDto> UpdateStatusAsync(Guid id, UpdateApplicationStatusRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<ApplicationMessageDto>> ListMessagesAsync(Guid id, CancellationToken ct = default);
    Task<ApplicationMessageDto> SendMessageAsync(Guid id, SendMessageRequest request, CancellationToken ct = default);

    /// <summary>Accepted applicant claims payment for their work. Notifies the company.</summary>
    Task<ApplicationDto> ClaimAsync(Guid id, ClaimPaymentRequest request, CancellationToken ct = default);

    /// <summary>Company releases money to an accepted applicant; it lands in their wallet.</summary>
    Task<ApplicationDto> PayAsync(Guid id, PayApplicantRequest request, CancellationToken ct = default);
}

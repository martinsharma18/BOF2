using BOF2.Application.Common;
using BOF2.Domain.Enums;
using FluentValidation;

namespace BOF2.Application.Invitations;

/// <summary>Who receives an invitation (in their inbox). Every filter is optional; none at all means every individual.</summary>
public class InvitationAudience
{
    public string? Province { get; set; }
    public string? District { get; set; }
    public string? LocalLevel { get; set; }
    public Gender? Gender { get; set; }
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }
}

public class SendInvitationRequest : InvitationAudience
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public Guid? PostId { get; set; }
}

public record InvitationDto(
    Guid Id,
    string Title,
    string Message,
    Guid? PostId,
    string? PostTitle,
    string? Province,
    string? District,
    string? LocalLevel,
    Gender? Gender,
    int? MinAge,
    int? MaxAge,
    int RecipientCount,
    DateTime CreatedAt);

public record AudienceCountDto(int Count);

public class InvitationAudienceValidator : AbstractValidator<InvitationAudience>
{
    public const int MinimumAge = 16;
    public const int MaximumAge = 100;

    public InvitationAudienceValidator()
    {
        RuleFor(x => x.Province).Must(p => BOF2.Domain.NepalLocations.Provinces.ContainsKey(p!))
            .When(x => !string.IsNullOrEmpty(x.Province)).WithMessage("Unknown province.");
        RuleFor(x => x.District).Must((x, d) => BOF2.Domain.NepalLocations.IsValid(x.Province, d))
            .When(x => !string.IsNullOrEmpty(x.District)).WithMessage("District does not belong to the selected province.");
        RuleFor(x => x.LocalLevel).Must((x, l) => BOF2.Domain.NepalLocalLevels.IsValid(x.District, l))
            .When(x => !string.IsNullOrEmpty(x.LocalLevel)).WithMessage("Local level does not belong to the selected district.");
        RuleFor(x => x.Gender).IsInEnum().When(x => x.Gender.HasValue);
        RuleFor(x => x.MinAge).InclusiveBetween(MinimumAge, MaximumAge).When(x => x.MinAge.HasValue);
        RuleFor(x => x.MaxAge).InclusiveBetween(MinimumAge, MaximumAge).When(x => x.MaxAge.HasValue);
        RuleFor(x => x.MaxAge).GreaterThanOrEqualTo(x => x.MinAge)
            .When(x => x.MinAge.HasValue && x.MaxAge.HasValue).WithMessage("Maximum age must be at least the minimum age.");
    }
}

public class SendInvitationValidator : AbstractValidator<SendInvitationRequest>
{
    public SendInvitationValidator()
    {
        Include(new InvitationAudienceValidator());
        RuleFor(x => x.Title).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Message).NotEmpty().MaximumLength(500);
    }
}

public interface IInvitationService
{
    Task<AudienceCountDto> CountAudienceAsync(InvitationAudience audience, CancellationToken ct = default);

    Task<InvitationDto> SendAsync(SendInvitationRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<InvitationDto>> ListMineAsync(CancellationToken ct = default);
}

using BOF2.Application.Common;
using BOF2.Domain.Enums;
using FluentValidation;

namespace BOF2.Application.Ads;

public record AdDto(
    Guid Id,
    string Title,
    string? Description,
    string ImageUrl,
    string? LinkUrl,
    AdPlacement Placement,
    bool IsActive,
    DateTime? StartsAt,
    DateTime? EndsAt,
    DateTime CreatedAt);

public class AdFormRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? LinkUrl { get; set; }
    public AdPlacement Placement { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? StartsAt { get; set; }
    public DateTime? EndsAt { get; set; }
}

public class AdFormValidator : AbstractValidator<AdFormRequest>
{
    public AdFormValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Description).MaximumLength(300);
        RuleFor(x => x.LinkUrl).MaximumLength(500).HttpUrl().When(x => !string.IsNullOrWhiteSpace(x.LinkUrl));
        RuleFor(x => x.Placement).IsInEnum();
        RuleFor(x => x.EndsAt).GreaterThan(x => x.StartsAt)
            .When(x => x.StartsAt.HasValue && x.EndsAt.HasValue)
            .WithMessage("End date must be after the start date.");
    }
}

public interface IAdService
{
    Task<IReadOnlyList<AdDto>> GetActiveAsync(AdPlacement placement, int count, CancellationToken ct = default);

    Task<IReadOnlyList<AdDto>> ListAllAsync(CancellationToken ct = default);
    Task<AdDto> CreateAsync(AdFormRequest request, FileUpload? image, CancellationToken ct = default);
    Task<AdDto> UpdateAsync(Guid id, AdFormRequest request, FileUpload? image, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

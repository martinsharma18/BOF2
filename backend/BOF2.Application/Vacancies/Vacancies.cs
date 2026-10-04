using FluentValidation;

namespace Feedora.Application.Vacancies;

public record VacancyDto(
    Guid Id,
    string Title,
    string Organization,
    string Location,
    string Description,
    string? HowToApply,
    DateOnly? Deadline,
    bool IsActive,
    DateTime CreatedAt);

public record VacancyRequest(
    string Title,
    string Organization,
    string Location,
    string Description,
    string? HowToApply,
    DateOnly? Deadline,
    bool IsActive = true);

public class VacancyValidator : AbstractValidator<VacancyRequest>
{
    public VacancyValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Organization).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Location).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.HowToApply).MaximumLength(300);
    }
}

/// <remarks>Creating (or first activating) a vacancy also sends it to every individual's inbox.</remarks>
public interface IVacancyService
{
    /// <summary>Active vacancies whose deadline hasn't passed, newest first.</summary>
    Task<IReadOnlyList<VacancyDto>> GetOpenAsync(int count, CancellationToken ct = default);

    Task<IReadOnlyList<VacancyDto>> ListAllAsync(CancellationToken ct = default);
    Task<VacancyDto> CreateAsync(VacancyRequest request, CancellationToken ct = default);
    Task<VacancyDto> UpdateAsync(Guid id, VacancyRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

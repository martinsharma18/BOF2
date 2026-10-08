using BOF2.Application.Common;
using BOF2.Domain.Enums;
using FluentValidation;

namespace BOF2.Application.Vacancies;

public record VacancyDto(
    Guid Id,
    string Title,
    string Organization,
    string Location,
    string Description,
    string? HowToApply,
    DateOnly? Deadline,
    bool IsActive,
    DateTime CreatedAt,
    /// <summary>Admin list only (0 elsewhere): all applications, and those still waiting for a decision.</summary>
    int ApplicationCount = 0,
    int PendingApplicationCount = 0);

public record MyVacancyApplicationDto(Guid Id, VacancyApplicationStatus Status, DateTime CreatedAt);

public record VacancyApplicationDto(
    Guid Id,
    Guid VacancyId,
    string VacancyTitle,
    Guid ApplicantId,
    string ApplicantName,
    string ApplicantEmail,
    string? ApplicantPhone,
    string? ApplicantAvatarUrl,
    string CvUrl,
    string CvFileName,
    string? Note,
    VacancyApplicationStatus Status,
    DateTime CreatedAt,
    DateTime? ReviewedAt);

public class VacancyApplicationQuery : PageQuery
{
    public Guid? VacancyId { get; set; }
    public VacancyApplicationStatus? Status { get; set; }
}

public record SetVacancyApplicationStatusRequest(VacancyApplicationStatus Status);

public class VacancyApplyNoteValidator : AbstractValidator<VacancyApplyRequest>
{
    public VacancyApplyNoteValidator()
    {
        RuleFor(x => x.Note).MaximumLength(500);
    }
}

public record VacancyApplyRequest(string? Note);

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
    Task<IReadOnlyList<VacancyDto>> GetOpenAsync(int count, CancellationToken ct = default);

    Task<IReadOnlyList<VacancyDto>> ListAllAsync(CancellationToken ct = default);
    Task<VacancyDto> CreateAsync(VacancyRequest request, CancellationToken ct = default);
    Task<VacancyDto> UpdateAsync(Guid id, VacancyRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);

    /// <summary>Individual: apply to an open vacancy with a CV (photo or PDF). One application per vacancy.</summary>
    Task<MyVacancyApplicationDto> ApplyAsync(Guid vacancyId, VacancyApplyRequest request, FileUpload? cv, CancellationToken ct = default);

    Task<MyVacancyApplicationDto?> GetMineAsync(Guid vacancyId, CancellationToken ct = default);

    Task<PagedResult<VacancyApplicationDto>> ListApplicationsAsync(VacancyApplicationQuery query, CancellationToken ct = default);

    /// <summary>Admin: accept or reject (or move back to pending). The applicant is notified.</summary>
    Task<VacancyApplicationDto> SetApplicationStatusAsync(Guid applicationId, VacancyApplicationStatus status, CancellationToken ct = default);
}

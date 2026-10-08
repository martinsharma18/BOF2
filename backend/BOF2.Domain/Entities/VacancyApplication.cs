using BOF2.Domain.Enums;

namespace BOF2.Domain.Entities;

public class VacancyApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid VacancyId { get; set; }
    public Vacancy Vacancy { get; set; } = null!;

    public Guid ApplicantId { get; set; }
    public AppUser Applicant { get; set; } = null!;

    public string CvUrl { get; set; } = string.Empty;
    public string CvFileName { get; set; } = string.Empty;

    public string? Note { get; set; }

    public VacancyApplicationStatus Status { get; set; } = VacancyApplicationStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}

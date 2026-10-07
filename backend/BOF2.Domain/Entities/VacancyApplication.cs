using BOF2.Domain.Enums;

namespace BOF2.Domain.Entities;

/// <summary>An individual's application to an admin vacancy, with their CV. Reviewed by admins.</summary>
public class VacancyApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid VacancyId { get; set; }
    public Vacancy Vacancy { get; set; } = null!;

    public Guid ApplicantId { get; set; }
    public AppUser Applicant { get; set; } = null!;

    /// <summary>The CV: a photo or a PDF.</summary>
    public string CvUrl { get; set; } = string.Empty;
    public string CvFileName { get; set; } = string.Empty;

    /// <summary>Optional short message to the admin.</summary>
    public string? Note { get; set; }

    public VacancyApplicationStatus Status { get; set; } = VacancyApplicationStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}

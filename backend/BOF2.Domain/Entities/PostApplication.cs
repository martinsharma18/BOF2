using BOF2.Domain.Enums;

namespace BOF2.Domain.Entities;

/// <summary>An individual's application (or claim) on a company post. One per person per post.</summary>
public class PostApplication
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;

    public Guid ApplicantId { get; set; }
    public AppUser Applicant { get; set; } = null!;

    public ApplicationKind Kind { get; set; }
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;
    public string Message { get; set; } = string.Empty;

    /// <summary>Set when the accepted applicant claims payment; cleared when the company pays.</summary>
    public decimal? ClaimedAmount { get; set; }
    public string? ClaimNote { get; set; }
    public DateTime? ClaimedAt { get; set; }

    public string? ClaimAttachmentUrl { get; set; }
    public string? ClaimAttachmentName { get; set; }

    /// <summary>Why the company turned down the last claim. Cleared when the applicant claims again.</summary>
    public string? ClaimDeclineReason { get; set; }

    /// <summary>When each side last opened the chat; newer messages from the other side count as unread.</summary>
    public DateTime? ApplicantReadAt { get; set; }
    public DateTime? CompanyReadAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<ApplicationMessage> Messages { get; set; } = new List<ApplicationMessage>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

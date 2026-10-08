using BOF2.Domain.Enums;

namespace BOF2.Domain.Entities;

/// <summary>
/// A company's invitation, sent as a notification to every individual that matches the filters
/// (location, gender, age). Empty filters mean "everyone".
/// </summary>
public class Invitation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CompanyId { get; set; }
    public AppUser Company { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    public Guid? PostId { get; set; }
    public Post? Post { get; set; }

    public string? Province { get; set; }
    public string? District { get; set; }
    public string? LocalLevel { get; set; }
    public Gender? Gender { get; set; }
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }

    public int RecipientCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

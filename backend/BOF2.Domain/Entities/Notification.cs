using BOF2.Domain.Enums;

namespace BOF2.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    /// <summary>Who caused it (the company, the applicant, the admin). Null for system messages.</summary>
    public Guid? ActorId { get; set; }
    public AppUser? Actor { get; set; }

    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }

    /// <summary>App route to open, e.g. /applications?id=...</summary>
    public string? Link { get; set; }

    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

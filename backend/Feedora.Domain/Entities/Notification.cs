using Feedora.Domain.Enums;

namespace Feedora.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Who receives the notification.</summary>
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Body { get; set; }

    /// <summary>App route to open, e.g. /applications?id=...</summary>
    public string? Link { get; set; }

    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

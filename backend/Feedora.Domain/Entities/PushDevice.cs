namespace Feedora.Domain.Entities;

/// <summary>
/// A browser/phone that allowed notifications (a Web Push subscription). Pushes for <see cref="UserId"/>
/// go to every device they have; signing out unlinks the device.
/// </summary>
public class PushDevice
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    /// <summary>The push service URL the browser gave us (unique per device and browser).</summary>
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

namespace BOF2.Domain.Entities;

/// <summary>A one-time code sent by SMS to the account's phone number to reset a forgotten password.</summary>
public class PasswordResetCode
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    /// <summary>SHA-256 hash of the 6-digit code; the code itself is only sent by SMS.</summary>
    public string CodeHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }

    /// <summary>Wrong guesses so far. The code stops working after a few.</summary>
    public int Attempts { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

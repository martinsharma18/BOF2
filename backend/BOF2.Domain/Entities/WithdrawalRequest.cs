using BOF2.Domain.Enums;

namespace BOF2.Domain.Entities;

/// <summary>An individual asking to cash out their wallet. An admin sends the money and marks it paid.</summary>
public class WithdrawalRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public decimal Amount { get; set; }

    /// <summary>Bank or wallet (eSewa, Khalti…) to send the money to.</summary>
    public string BankName { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;

    public WithdrawalStatus Status { get; set; } = WithdrawalStatus.Pending;
    public string? AdminNote { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
}

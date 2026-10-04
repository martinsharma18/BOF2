namespace BOF2.Domain.Enums;

public enum WithdrawalStatus
{
    /// <summary>Waiting for an admin to send the money.</summary>
    Pending = 1,
    Paid = 2,
    Rejected = 3
}

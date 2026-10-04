namespace BOF2.Domain.Enums;

public enum NotificationType
{
    ApplicationReceived = 1,
    ApplicationAccepted = 2,
    ApplicationRejected = 3,
    NewMessage = 4,
    PaymentReceived = 5,
    WithdrawalRequested = 6,
    WithdrawalPaid = 7,
    WithdrawalRejected = 8,
    PaymentClaimed = 9,
    Invitation = 10,
    ClaimDeclined = 11
}

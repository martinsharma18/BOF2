using BOF2.Application.Common;
using BOF2.Domain.Enums;
using FluentValidation;

namespace BOF2.Application.Wallet;

public record PaymentDto(Guid Id, decimal Amount, string? Note, DateTime CreatedAt, AuthorDto Payer, Guid PostId, string PostTitle);

public record WithdrawalDto(
    Guid Id,
    decimal Amount,
    string BankName,
    string AccountName,
    string AccountNumber,
    WithdrawalStatus Status,
    string? AdminNote,
    DateTime CreatedAt,
    DateTime? ProcessedAt,
    AuthorDto User);

public record WalletDto(
    decimal Balance,
    decimal TotalEarned,
    decimal PendingWithdrawal,
    decimal TotalWithdrawn,
    IReadOnlyList<PaymentDto> RecentPayments,
    IReadOnlyList<WithdrawalDto> Withdrawals);

public record WithdrawRequest(decimal Amount, string BankName, string AccountName, string AccountNumber);

/// <summary>The admin flags a request as Pending, Paid ("Done") or Rejected. The flag can be changed later.</summary>
public record ProcessWithdrawalRequest(WithdrawalStatus Status, string? Note);

public class WithdrawalQuery : PageQuery
{
    public WithdrawalStatus? Status { get; set; }
}

public class WithdrawValidator : AbstractValidator<WithdrawRequest>
{
    public const decimal Minimum = 100;

    public WithdrawValidator()
    {
        RuleFor(x => x.Amount).GreaterThanOrEqualTo(Minimum).WithMessage($"The minimum withdrawal is Rs. {Minimum}.");
        RuleFor(x => x.BankName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.AccountName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.AccountNumber).NotEmpty().MaximumLength(40)
            .Matches(@"^\+?[0-9A-Za-z\s-]+$").WithMessage("Enter an account or phone number (digits, letters, spaces or dashes).");
    }
}

public class ProcessWithdrawalValidator : AbstractValidator<ProcessWithdrawalRequest>
{
    public ProcessWithdrawalValidator()
    {
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.Note).MaximumLength(300);
        RuleFor(x => x.Note).NotEmpty().When(x => x.Status == WithdrawalStatus.Rejected).WithMessage("Tell the user why the request was rejected.");
    }
}

public interface IWalletService
{
    Task<WalletDto> GetMineAsync(CancellationToken ct = default);
    Task<WithdrawalDto> RequestWithdrawalAsync(WithdrawRequest request, CancellationToken ct = default);

    // Admin
    Task<PagedResult<WithdrawalDto>> ListWithdrawalsAsync(WithdrawalQuery query, CancellationToken ct = default);
    Task<WithdrawalDto> ProcessWithdrawalAsync(Guid id, ProcessWithdrawalRequest request, CancellationToken ct = default);
}

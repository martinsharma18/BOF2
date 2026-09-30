using Feedora.Application.Common;
using Feedora.Domain.Enums;
using FluentValidation;

namespace Feedora.Application.Wallet;

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

public record ProcessWithdrawalRequest(bool Paid, string? Note);

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
            .Matches(@"^[0-9A-Za-z\s-]+$").WithMessage("Use digits, letters, spaces or dashes only.");
    }
}

public class ProcessWithdrawalValidator : AbstractValidator<ProcessWithdrawalRequest>
{
    public ProcessWithdrawalValidator()
    {
        RuleFor(x => x.Note).MaximumLength(300);
        RuleFor(x => x.Note).NotEmpty().When(x => !x.Paid).WithMessage("Tell the user why the request was rejected.");
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

using System.Data;
using Feedora.Application.Common;
using Feedora.Application.Wallet;
using Feedora.Domain.Entities;
using Feedora.Domain.Enums;
using Feedora.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Feedora.Infrastructure.Services;

public class WalletService(
    AppDbContext db,
    ICurrentUser currentUser,
    IValidator<WithdrawRequest> withdrawValidator,
    IValidator<ProcessWithdrawalRequest> processValidator) : IWalletService
{
    public async Task<WalletDto> GetMineAsync(CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();

        var earned = await db.Payments.Where(p => p.RecipientId == userId).SumAsync(p => (decimal?)p.Amount, ct) ?? 0;
        var withdrawals = await db.Withdrawals.AsNoTracking()
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync(ct);
        var pending = withdrawals.Where(w => w.Status == WithdrawalStatus.Pending).Sum(w => w.Amount);
        var withdrawn = withdrawals.Where(w => w.Status == WithdrawalStatus.Paid).Sum(w => w.Amount);

        var payments = await db.Payments.AsNoTracking()
            .Where(p => p.RecipientId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Take(20)
            .Select(p => new { p.Id, p.Amount, p.Note, p.CreatedAt, p.PayerId, p.Application.PostId, p.Application.Post.Title })
            .ToListAsync(ct);

        var people = await db.LoadAuthorsAsync(payments.Select(p => p.PayerId).Append(userId), ct);

        return new WalletDto(
            Balance: earned - pending - withdrawn,
            TotalEarned: earned,
            PendingWithdrawal: pending,
            TotalWithdrawn: withdrawn,
            RecentPayments: payments.Select(p => new PaymentDto(p.Id, p.Amount, p.Note, p.CreatedAt, people[p.PayerId], p.PostId, p.Title)).ToList(),
            Withdrawals: withdrawals.Take(20).Select(w => ToDto(w, people[userId])).ToList());
    }

    public async Task<WithdrawalDto> RequestWithdrawalAsync(WithdrawRequest request, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await withdrawValidator.ValidateAndThrowAsync(request, ct);

        // Serializable so two parallel requests can't both spend the same balance.
        var strategy = db.Database.CreateExecutionStrategy();
        var withdrawal = await strategy.ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);

            if (await db.Withdrawals.AnyAsync(w => w.UserId == userId && w.Status == WithdrawalStatus.Pending, ct))
                throw Error("You already have a withdrawal waiting for the admin. Please wait until it is paid.");

            var earned = await db.Payments.Where(p => p.RecipientId == userId).SumAsync(p => (decimal?)p.Amount, ct) ?? 0;
            var spent = await db.Withdrawals.Where(w => w.UserId == userId && w.Status != WithdrawalStatus.Rejected)
                .SumAsync(w => (decimal?)w.Amount, ct) ?? 0;
            var amount = decimal.Round(request.Amount, 2);
            if (amount > earned - spent)
                throw Error($"You can withdraw up to Rs. {earned - spent:N0}.");

            var entity = new WithdrawalRequest
            {
                UserId = userId,
                Amount = amount,
                BankName = request.BankName.Trim(),
                AccountName = request.AccountName.Trim(),
                AccountNumber = request.AccountNumber.Trim(),
            };
            db.Withdrawals.Add(entity);

            var name = await db.Users.Where(u => u.Id == userId).Select(u => u.FullName).FirstAsync(ct);
            var adminIds = await db.Users.Where(u => u.AccountType == AccountType.Admin && !u.IsDisabled).Select(u => u.Id).ToListAsync(ct);
            foreach (var adminId in adminIds)
                db.Notify(adminId, NotificationType.WithdrawalRequested,
                    $"{name} requested a withdrawal of Rs. {amount:N0}", $"{entity.BankName} · {entity.AccountName}", "/admin/withdrawals", actorId: userId);

            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return entity;
        });

        var people = await db.LoadAuthorsAsync([userId], ct);
        return ToDto(withdrawal, people[userId]);
    }

    public async Task<PagedResult<WithdrawalDto>> ListWithdrawalsAsync(WithdrawalQuery query, CancellationToken ct = default)
    {
        var withdrawals = db.Withdrawals.AsNoTracking();
        if (query.Status is { } status)
            withdrawals = withdrawals.Where(w => w.Status == status);

        var total = await withdrawals.CountAsync(ct);
        var page = await withdrawals
            .OrderBy(w => w.Status == WithdrawalStatus.Pending ? 0 : 1)
            .ThenByDescending(w => w.CreatedAt)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .ToListAsync(ct);

        var people = await db.LoadAuthorsAsync(page.Select(w => w.UserId), ct);
        return new PagedResult<WithdrawalDto>(page.Select(w => ToDto(w, people[w.UserId])).ToList(), query.Page, query.PageSize, total);
    }

    public async Task<WithdrawalDto> ProcessWithdrawalAsync(Guid id, ProcessWithdrawalRequest request, CancellationToken ct = default)
    {
        await processValidator.ValidateAndThrowAsync(request, ct);
        var withdrawal = await db.Withdrawals.FirstOrDefaultAsync(w => w.Id == id, ct)
                         ?? throw new NotFoundException("Withdrawal not found.");
        if (withdrawal.Status == request.Status)
            throw Error($"This request is already {Label(request.Status)}.");

        // A rejected request gave its money back to the wallet. Re-opening it takes the money again,
        // so the user must still have it.
        if (withdrawal.Status == WithdrawalStatus.Rejected)
        {
            var earned = await db.Payments.Where(p => p.RecipientId == withdrawal.UserId).SumAsync(p => (decimal?)p.Amount, ct) ?? 0;
            var spent = await db.Withdrawals
                .Where(w => w.UserId == withdrawal.UserId && w.Id != withdrawal.Id && w.Status != WithdrawalStatus.Rejected)
                .SumAsync(w => (decimal?)w.Amount, ct) ?? 0;
            if (withdrawal.Amount > earned - spent)
                throw Error($"The user's wallet only has Rs. {earned - spent:N0} now, so this request can't be re-opened.");
        }

        withdrawal.Status = request.Status;
        withdrawal.AdminNote = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        withdrawal.ProcessedAt = request.Status == WithdrawalStatus.Pending ? null : DateTime.UtcNow;

        var (type, title) = request.Status switch
        {
            WithdrawalStatus.Paid => (NotificationType.WithdrawalPaid, $"Done: Rs. {withdrawal.Amount:N0} has been sent to your account"),
            WithdrawalStatus.Rejected => (NotificationType.WithdrawalRejected, $"Your withdrawal of Rs. {withdrawal.Amount:N0} was rejected"),
            _ => (NotificationType.WithdrawalRequested, $"Your withdrawal of Rs. {withdrawal.Amount:N0} is pending again"),
        };
        db.Notify(withdrawal.UserId, type, title,
            withdrawal.AdminNote ?? $"{withdrawal.BankName} · {withdrawal.AccountNumber}",
            "/wallet",
            actorId: currentUser.UserId);

        await db.SaveChangesAsync(ct);
        var people = await db.LoadAuthorsAsync([withdrawal.UserId], ct);
        return ToDto(withdrawal, people[withdrawal.UserId]);
    }

    private static string Label(WithdrawalStatus status) => status switch
    {
        WithdrawalStatus.Paid => "done",
        WithdrawalStatus.Rejected => "rejected",
        _ => "pending",
    };

    private static WithdrawalDto ToDto(WithdrawalRequest w, AuthorDto user) =>
        new(w.Id, w.Amount, w.BankName, w.AccountName, w.AccountNumber, w.Status, w.AdminNote, w.CreatedAt, w.ProcessedAt, user);

    private static FieldErrorsException Error(string message) =>
        new(new Dictionary<string, string[]> { ["Amount"] = [message] });
}

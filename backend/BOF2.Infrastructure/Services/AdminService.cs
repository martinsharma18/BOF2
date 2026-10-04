using Feedora.Application.Admin;
using Feedora.Application.Common;
using Feedora.Domain.Enums;
using Feedora.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Feedora.Infrastructure.Services;

public class AdminService(AppDbContext db, ICurrentUser currentUser) : IAdminService
{
    public async Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default)
    {
        var weekAgo = DateTime.UtcNow.AddDays(-7);
        var now = DateTime.UtcNow;

        // Sequential on purpose: a DbContext does not support parallel queries.
        var usersByType = await db.Users.GroupBy(u => u.AccountType)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Type, x => x.Count, ct);

        return new AdminStatsDto(
            TotalUsers: usersByType.Values.Sum(),
            Companies: usersByType.GetValueOrDefault(AccountType.Company),
            Individuals: usersByType.GetValueOrDefault(AccountType.Individual),
            NewUsersLast7Days: await db.Users.CountAsync(u => u.CreatedAt >= weekAgo, ct),
            TotalPosts: await db.Posts.CountAsync(ct),
            PostsLast7Days: await db.Posts.CountAsync(p => p.CreatedAt >= weekAgo, ct),
            TotalReactions: await db.Reactions.CountAsync(ct),
            TotalFeedback: await db.Feedbacks.CountAsync(ct),
            ActiveAds: await db.Ads.CountAsync(a => a.IsActive
                                                   && (a.StartsAt == null || a.StartsAt <= now)
                                                   && (a.EndsAt == null || a.EndsAt > now), ct),
            TotalApplications: await db.Applications.CountAsync(ct),
            PendingWithdrawals: await db.Withdrawals.CountAsync(w => w.Status == WithdrawalStatus.Pending, ct),
            PendingWithdrawalAmount: await db.Withdrawals.Where(w => w.Status == WithdrawalStatus.Pending)
                .SumAsync(w => (decimal?)w.Amount, ct) ?? 0,
            TotalPaidOut: await db.Withdrawals.Where(w => w.Status == WithdrawalStatus.Paid)
                .SumAsync(w => (decimal?)w.Amount, ct) ?? 0);
    }

    public async Task<PagedResult<AdminUserDto>> GetUsersAsync(AdminUserQuery query, CancellationToken ct = default)
    {
        var users = db.Users.AsNoTracking();

        if (query.AccountType is { } type)
            users = users.Where(u => u.AccountType == type);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = Projections.ToLikePattern(query.Search);
            users = users.Where(u =>
                EF.Functions.ILike(u.FullName, pattern) ||
                EF.Functions.ILike(u.Email!, pattern) ||
                (u.PhoneNumber != null && EF.Functions.ILike(u.PhoneNumber, pattern)) ||
                (u.CompanyProfile != null && EF.Functions.ILike(u.CompanyProfile.CompanyName, pattern)));
        }

        var total = await users.CountAsync(ct);
        var items = await users
            .OrderByDescending(u => u.CreatedAt)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .Select(u => new AdminUserDto(
                u.Id,
                u.FullName,
                u.Email!,
                u.PhoneNumber,
                u.AccountType,
                u.CompanyProfile != null ? u.CompanyProfile.CompanyName : null,
                u.IsDisabled,
                u.CreatedAt,
                u.Posts.Count))
            .ToListAsync(ct);

        return new PagedResult<AdminUserDto>(items, query.Page, query.PageSize, total);
    }

    public async Task SetDisabledAsync(Guid userId, bool disabled, CancellationToken ct = default)
    {
        if (userId == currentUser.UserId)
            throw new ForbiddenException("You cannot disable your own account.");

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundException("User not found.");
        if (user.AccountType == AccountType.Admin)
            throw new ForbiddenException("Admin accounts cannot be disabled.");

        user.IsDisabled = disabled;
        await db.SaveChangesAsync(ct);

        if (disabled)
        {
            // End their sessions: refresh tokens stop working immediately.
            var now = DateTime.UtcNow;
            await db.RefreshTokens.Where(t => t.UserId == userId && t.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
        }
    }
}

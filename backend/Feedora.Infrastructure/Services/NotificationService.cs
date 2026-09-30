using Feedora.Application.Common;
using Feedora.Application.Notifications;
using Feedora.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Feedora.Infrastructure.Services;

public class NotificationService(AppDbContext db, ICurrentUser currentUser) : INotificationService
{
    public async Task<PagedResult<NotificationDto>> ListAsync(NotificationQuery query, CancellationToken ct = default)
    {
        var mine = db.Notifications.AsNoTracking().Where(n => n.UserId == currentUser.RequireUserId());
        var total = await mine.CountAsync(ct);
        var items = await mine
            .OrderByDescending(n => n.CreatedAt)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .Select(n => new NotificationDto(n.Id, n.Type, n.Title, n.Body, n.Link, n.IsRead, n.CreatedAt))
            .ToListAsync(ct);
        return new PagedResult<NotificationDto>(items, query.Page, query.PageSize, total);
    }

    public Task<int> UnreadCountAsync(CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        return db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);
    }

    public async Task MarkReadAsync(Guid id, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await db.Notifications.Where(n => n.Id == id && n.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
    }

    public async Task MarkAllReadAsync(CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await db.Notifications.Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
    }
}

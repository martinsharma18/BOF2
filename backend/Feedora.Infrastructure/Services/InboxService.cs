using Feedora.Application.Common;
using Feedora.Application.Inbox;
using Feedora.Application.Vacancies;
using Feedora.Domain.Enums;
using Feedora.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Feedora.Infrastructure.Services;

public class InboxService(AppDbContext db, ICurrentUser currentUser) : IInboxService
{
    public async Task<PagedResult<InboxItemDto>> ListAsync(InboxQuery query, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        var items = db.InboxItems.AsNoTracking().Where(i => i.UserId == userId);
        if (query.Kind is { } kind) items = items.Where(i => i.Kind == kind);
        if (query.UnreadOnly) items = items.Where(i => !i.IsRead);

        var total = await items.CountAsync(ct);
        var rows = await items
            .OrderByDescending(i => i.CreatedAt)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .Select(i => new
            {
                Item = i,
                i.Invitation,
                PostTitle = i.Invitation != null && i.Invitation.Post != null ? i.Invitation.Post.Title : null,
                i.Vacancy,
            })
            .ToListAsync(ct);

        var senders = await db.LoadAuthorsAsync(rows.Where(r => r.Invitation != null).Select(r => r.Invitation!.CompanyId), ct);

        var dtos = rows.Select(r =>
        {
            if (r.Invitation is { } inv)
                return new InboxItemDto(r.Item.Id, r.Item.Kind, r.Item.IsRead, r.Item.CreatedAt,
                    senders.GetValueOrDefault(inv.CompanyId), inv.Title, Preview(inv.Message),
                    new InboxInvitationDto(inv.Message, inv.PostId, r.PostTitle), null);

            var v = r.Vacancy!;
            return new InboxItemDto(r.Item.Id, r.Item.Kind, r.Item.IsRead, r.Item.CreatedAt,
                null, $"Vacancy: {v.Title}", Preview($"{v.Organization} · {v.Location}. {v.Description}"), null,
                new VacancyDto(v.Id, v.Title, v.Organization, v.Location, v.Description, v.HowToApply, v.Deadline, v.IsActive, v.CreatedAt));
        }).ToList();

        return new PagedResult<InboxItemDto>(dtos, query.Page, query.PageSize, total);
    }

    public Task<int> UnreadCountAsync(CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        return db.InboxItems.CountAsync(i => i.UserId == userId && !i.IsRead, ct);
    }

    public async Task MarkReadAsync(Guid id, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await db.InboxItems.Where(i => i.Id == id && i.UserId == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.IsRead, true), ct);
    }

    public async Task MarkAllReadAsync(CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await db.InboxItems.Where(i => i.UserId == userId && !i.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.IsRead, true), ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await db.InboxItems.Where(i => i.Id == id && i.UserId == userId).ExecuteDeleteAsync(ct);
    }

    private static string Preview(string text) => text.Length <= 140 ? text : text[..139] + "…";
}

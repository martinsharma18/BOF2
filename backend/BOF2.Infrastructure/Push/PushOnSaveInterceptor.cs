using Feedora.Domain.Entities;
using Feedora.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Feedora.Infrastructure.Push;

/// <summary>
/// Turns every new notification and inbox message into a phone push, once it is safely saved. Hooking
/// SaveChanges means no service has to remember to send pushes.
/// </summary>
public class PushOnSaveInterceptor(PushQueue queue) : SaveChangesInterceptor
{
    // Scoped like the DbContext, so this only holds the current save's items.
    private List<PushNote> pending = [];

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        Collect(eventData.Context);
        return base.SavingChangesAsync(eventData, result, ct);
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Collect(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result, CancellationToken ct = default)
    {
        Flush();
        return base.SavedChangesAsync(eventData, result, ct);
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
        Flush();
        return base.SavedChanges(eventData, result);
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData) => pending = [];

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken ct = default)
    {
        pending = [];
        return Task.CompletedTask;
    }

    private void Collect(DbContext? context)
    {
        if (context is null) return;
        pending = [];

        foreach (var entry in context.ChangeTracker.Entries<Notification>().Where(e => e.State == EntityState.Added))
        {
            var n = entry.Entity;
            pending.Add(new PushNote(n.UserId, n.Title, n.Body, n.Link ?? "/notifications", n.Type.ToString()));
        }

        foreach (var entry in context.ChangeTracker.Entries<InboxItem>().Where(e => e.State == EntityState.Added))
        {
            var item = entry.Entity;
            if (item.Kind == InboxItemKind.Invitation)
            {
                var invitation = context.Set<Invitation>().Local.FirstOrDefault(i => i.Id == item.InvitationId);
                pending.Add(new PushNote(item.UserId, "New invitation", invitation?.Title, "/inbox", "invitation"));
            }
            else
            {
                var vacancy = context.Set<Vacancy>().Local.FirstOrDefault(v => v.Id == item.VacancyId);
                pending.Add(new PushNote(item.UserId, "New vacancy",
                    vacancy is null ? null : $"{vacancy.Title} · {vacancy.Organization}", "/inbox", "vacancy"));
            }
        }
    }

    private void Flush()
    {
        foreach (var note in pending) queue.Enqueue(note);
        pending = [];
    }
}

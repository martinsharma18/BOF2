using BOF2.Domain.Entities;
using BOF2.Domain.Enums;
using BOF2.Infrastructure.Persistence;

namespace BOF2.Infrastructure.Services;

internal static class Notifier
{
    /// <summary>Queues a notification; it is saved together with the caller's next SaveChanges.</summary>
    public static void Notify(this AppDbContext db, Guid userId, NotificationType type, string title, string? body = null, string? link = null, Guid? actorId = null) =>
        db.Notifications.Add(new Notification
        {
            UserId = userId,
            ActorId = actorId,
            Type = type,
            Title = Truncate(title, 200)!,
            Body = Truncate(body, 500),
            Link = link,
        });

    private static string? Truncate(string? value, int max) =>
        value is null || value.Length <= max ? value : value[..(max - 1)] + "…";
}

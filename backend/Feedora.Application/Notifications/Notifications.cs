using Feedora.Application.Common;
using Feedora.Domain.Enums;

namespace Feedora.Application.Notifications;

public record NotificationDto(
    Guid Id,
    NotificationType Type,
    string Title,
    string? Body,
    string? Link,
    bool IsRead,
    DateTime CreatedAt,
    AuthorDto? Actor);

public class NotificationQuery : PageQuery
{
    public bool UnreadOnly { get; set; }
}

public interface INotificationService
{
    Task<PagedResult<NotificationDto>> ListAsync(NotificationQuery query, CancellationToken ct = default);
    Task<int> UnreadCountAsync(CancellationToken ct = default);
    Task MarkReadAsync(Guid id, CancellationToken ct = default);
    Task MarkAllReadAsync(CancellationToken ct = default);
}

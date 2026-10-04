using Feedora.Application.Common;
using Feedora.Application.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Feedora.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(INotificationService notifications) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<NotificationDto>> List([FromQuery] NotificationQuery query, CancellationToken ct) =>
        notifications.ListAsync(query, ct);

    public record UnreadCountDto(int Count);

    /// <summary>Cheap endpoint the header polls for the bell badge.</summary>
    [HttpGet("unread-count")]
    public async Task<UnreadCountDto> UnreadCount(CancellationToken ct) => new(await notifications.UnreadCountAsync(ct));

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        await notifications.MarkReadAsync(id, ct);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await notifications.MarkAllReadAsync(ct);
        return NoContent();
    }
}

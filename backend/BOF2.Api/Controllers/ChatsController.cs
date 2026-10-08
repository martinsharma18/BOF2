using BOF2.Application.Applications;
using BOF2.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BOF2.Api.Controllers;

/// <summary>
/// Messages: one conversation per application. The thread itself is read and written through
/// /api/applications/{id}/messages; this lists conversations and tracks what has been read.
/// </summary>
[ApiController]
[Route("api/chats")]
[Authorize]
public class ChatsController(IApplicationService applications) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<ChatSummaryDto>> List([FromQuery] ChatQuery query, CancellationToken ct) =>
        applications.ListChatsAsync(query, ct);

    [HttpGet("unread-count")]
    public async Task<object> UnreadCount(CancellationToken ct) => new { count = await applications.UnreadChatCountAsync(ct) };

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        await applications.MarkChatReadAsync(id, ct);
        return NoContent();
    }
}

using BOF2.Application.Common;
using BOF2.Application.Inbox;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BOF2.Api.Controllers;

[ApiController]
[Route("api/inbox")]
[Authorize]
public class InboxController(IInboxService inbox) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<InboxItemDto>> List([FromQuery] InboxQuery query, CancellationToken ct) => inbox.ListAsync(query, ct);

    [HttpGet("unread-count")]
    public async Task<object> UnreadCount(CancellationToken ct) => new { count = await inbox.UnreadCountAsync(ct) };

    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id, CancellationToken ct)
    {
        await inbox.MarkReadAsync(id, ct);
        return NoContent();
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        await inbox.MarkAllReadAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await inbox.DeleteAsync(id, ct);
        return NoContent();
    }
}

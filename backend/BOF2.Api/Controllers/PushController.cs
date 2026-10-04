using BOF2.Application.Push;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BOF2.Api.Controllers;

/// <summary>Phone notifications (Web Push): link or unlink this device for the signed-in user.</summary>
[ApiController]
[Route("api/push")]
[Authorize]
public class PushController(IPushService push) : ControllerBase
{
    [HttpGet("public-key")]
    [AllowAnonymous]
    public PushPublicKeyDto PublicKey() => new(push.PublicKey);

    [HttpPost("subscriptions")]
    public async Task<IActionResult> Subscribe(PushSubscribeRequest request, CancellationToken ct)
    {
        await push.SubscribeAsync(request, ct);
        return NoContent();
    }

    [HttpPost("subscriptions/remove")]
    public async Task<IActionResult> Unsubscribe(PushUnsubscribeRequest request, CancellationToken ct)
    {
        await push.UnsubscribeAsync(request, ct);
        return NoContent();
    }
}

using BOF2.Application.Invitations;
using BOF2.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BOF2.Api.Controllers;

[ApiController]
[Route("api/invitations")]
[Authorize(Roles = Roles.Company)]
public class InvitationsController(IInvitationService invitations) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<InvitationDto>> GetMine(CancellationToken ct) => invitations.ListMineAsync(ct);

    [HttpGet("audience")]
    public Task<AudienceCountDto> CountAudience([FromQuery] InvitationAudience audience, CancellationToken ct) =>
        invitations.CountAudienceAsync(audience, ct);

    [HttpPost]
    public Task<InvitationDto> Send(SendInvitationRequest request, CancellationToken ct) => invitations.SendAsync(request, ct);
}

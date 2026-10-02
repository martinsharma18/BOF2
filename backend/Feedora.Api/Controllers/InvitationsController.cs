using Feedora.Application.Invitations;
using Feedora.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Feedora.Api.Controllers;

/// <summary>Companies invite matching individuals; each one gets a notification.</summary>
[ApiController]
[Route("api/invitations")]
[Authorize(Roles = Roles.Company)]
public class InvitationsController(IInvitationService invitations) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<InvitationDto>> GetMine(CancellationToken ct) => invitations.ListMineAsync(ct);

    /// <summary>How many individuals the filters reach, shown before sending.</summary>
    [HttpGet("audience")]
    public Task<AudienceCountDto> CountAudience([FromQuery] InvitationAudience audience, CancellationToken ct) =>
        invitations.CountAudienceAsync(audience, ct);

    [HttpPost]
    public Task<InvitationDto> Send(SendInvitationRequest request, CancellationToken ct) => invitations.SendAsync(request, ct);
}

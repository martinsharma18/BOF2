using Feedora.Application.Applications;
using Feedora.Application.Common;
using Feedora.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Feedora.Api.Controllers;

/// <summary>Applications on company posts, their chat thread and payouts.</summary>
[ApiController]
[Route("api/applications")]
[Authorize]
public class ApplicationsController(IApplicationService applications) : ControllerBase
{
    /// <summary>Company: applications received on its posts. Individual: applications it sent.</summary>
    [HttpGet]
    public Task<PagedResult<ApplicationDto>> List([FromQuery] ApplicationQuery query, CancellationToken ct) =>
        applications.ListAsync(query, ct);

    /// <summary>Counts per stage (New / Hired / Claimed / Paid / Declined).</summary>
    [HttpGet("summary")]
    public Task<ApplicationSummaryDto> Summary(Guid? postId, CancellationToken ct) => applications.SummaryAsync(postId, ct);

    [HttpGet("{id:guid}")]
    public Task<ApplicationDto> Get(Guid id, CancellationToken ct) => applications.GetAsync(id, ct);

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = Roles.Company)]
    public Task<ApplicationDto> SetStatus(Guid id, UpdateApplicationStatusRequest request, CancellationToken ct) =>
        applications.UpdateStatusAsync(id, request, ct);

    [HttpGet("{id:guid}/messages")]
    public Task<IReadOnlyList<ApplicationMessageDto>> Messages(Guid id, CancellationToken ct) =>
        applications.ListMessagesAsync(id, ct);

    [HttpPost("{id:guid}/messages")]
    public async Task<ActionResult<ApplicationMessageDto>> SendMessage(Guid id, SendMessageRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await applications.SendMessageAsync(id, request, ct));

    /// <summary>Accepted applicant claims payment; the company is notified and pays from Applicants.</summary>
    [HttpPost("{id:guid}/claim")]
    [Authorize(Roles = Roles.Individual)]
    public Task<ApplicationDto> Claim(Guid id, ClaimPaymentRequest request, CancellationToken ct) =>
        applications.ClaimAsync(id, request, ct);

    /// <summary>Company turns down the claim with a reason. The applicant can then claim again.</summary>
    [HttpPost("{id:guid}/claim/decline")]
    [Authorize(Roles = Roles.Company)]
    public Task<ApplicationDto> DeclineClaim(Guid id, DeclineClaimRequest request, CancellationToken ct) =>
        applications.DeclineClaimAsync(id, request, ct);

    /// <summary>Company pays the claimed amount. One payment per job; the job closes.</summary>
    [HttpPost("{id:guid}/payments")]
    [Authorize(Roles = Roles.Company)]
    public Task<ApplicationDto> Pay(Guid id, PayApplicantRequest request, CancellationToken ct) =>
        applications.PayAsync(id, request, ct);
}

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

    [HttpPost("{id:guid}/payments")]
    [Authorize(Roles = Roles.Company)]
    public Task<ApplicationDto> Pay(Guid id, PayApplicantRequest request, CancellationToken ct) =>
        applications.PayAsync(id, request, ct);
}

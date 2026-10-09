using BOF2.Api.Infrastructure;
using BOF2.Application.Applications;
using BOF2.Application.Common;
using BOF2.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BOF2.Api.Controllers;

[ApiController]
[Route("api/applications")]
[Authorize]
public class ApplicationsController(IApplicationService applications) : ControllerBase
{
    /// <summary>Company: applications received on its posts. Individual: applications it sent.</summary>
    [HttpGet]
    public Task<PagedResult<ApplicationDto>> List([FromQuery] ApplicationQuery query, CancellationToken ct) =>
        applications.ListAsync(query, ct);

    [HttpGet("summary")]
    public Task<ApplicationSummaryDto> Summary(Guid? postId, CancellationToken ct) => applications.SummaryAsync(postId, ct);

    [HttpGet("posts")]
    [Authorize(Roles = Roles.Company)]
    public Task<IReadOnlyList<ApplicationPostDto>> Posts(CancellationToken ct) => applications.ListPostsAsync(ct);

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

    /// <summary>
    /// Accepted applicant claims payment (multipart/form-data with an optional photo or PDF in <c>proof</c>);
    /// the company is notified and pays from Applicants.
    /// </summary>
    [HttpPost("{id:guid}/claim")]
    [Authorize(Roles = Roles.Individual)]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public Task<ApplicationDto> Claim(Guid id, [FromForm] ClaimPaymentRequest request, IFormFile? proof, CancellationToken ct) =>
        proof.WithUploadAsync(upload => applications.ClaimAsync(id, request, upload, ct));

    [HttpPost("{id:guid}/claim/decline")]
    [Authorize(Roles = Roles.Company + "," + Roles.Admin)]
    public Task<ApplicationDto> DeclineClaim(Guid id, DeclineClaimRequest request, CancellationToken ct) =>
        applications.DeclineClaimAsync(id, request, ct);

    [HttpPost("{id:guid}/payments")]
    [Authorize(Roles = Roles.Company + "," + Roles.Admin)]
    public Task<ApplicationDto> Pay(Guid id, PayApplicantRequest request, CancellationToken ct) =>
        applications.PayAsync(id, request, ct);
}

using Feedora.Api.Infrastructure;
using Feedora.Application.Applications;
using Feedora.Application.Common;
using Feedora.Application.Feedbacks;
using Feedora.Application.Posts;
using Feedora.Application.Reactions;
using Feedora.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Feedora.Api.Controllers;

[ApiController]
[Route("api/posts")]
[Authorize]
public class PostsController(
    IPostService posts,
    IReactionService reactions,
    IFeedbackService feedback,
    IApplicationService applications) : ControllerBase
{
    private const long MaxUploadBytes = 6 * 1024 * 1024;

    [HttpGet]
    public Task<PagedResult<PostDto>> GetFeed([FromQuery] PostQuery query, CancellationToken ct) =>
        posts.GetFeedAsync(query, ct);

    [HttpGet("{id:guid}")]
    public Task<PostDto> GetById(Guid id, CancellationToken ct) => posts.GetByIdAsync(id, ct);

    /// <summary>Create a post (multipart/form-data with an optional image in <c>media</c>).</summary>
    [HttpPost]
    [Authorize(Roles = Roles.Company)]
    [RequestSizeLimit(MaxUploadBytes)]
    public async Task<ActionResult<PostDto>> Create([FromForm] PostFormRequest request, IFormFile? media, CancellationToken ct)
    {
        var post = await media.WithUploadAsync(upload => posts.CreateAsync(request, upload, ct));
        return CreatedAtAction(nameof(GetById), new { id = post.Id }, post);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = Roles.Company)]
    [RequestSizeLimit(MaxUploadBytes)]
    public Task<PostDto> Update(Guid id, [FromForm] PostFormRequest request, IFormFile? media, CancellationToken ct) =>
        media.WithUploadAsync(upload => posts.UpdateAsync(id, request, upload, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await posts.DeleteAsync(id, ct);
        return NoContent();
    }

    /// <summary>Individual applies to a post with a message. After acceptance they claim payment via /api/applications/{id}/claim.</summary>
    [HttpPost("{id:guid}/applications")]
    [Authorize(Roles = Roles.Individual)]
    public async Task<ActionResult<ApplicationDto>> Apply(Guid id, ApplyRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await applications.ApplyAsync(id, request, ct));

    [HttpPut("{id:guid}/reaction")]
    public Task<ReactionSummaryDto> SetReaction(Guid id, SetReactionRequest request, CancellationToken ct) =>
        reactions.SetAsync(id, request, ct);

    [HttpDelete("{id:guid}/reaction")]
    public Task<ReactionSummaryDto> RemoveReaction(Guid id, CancellationToken ct) =>
        reactions.RemoveAsync(id, ct);

    [HttpGet("{id:guid}/feedback")]
    public Task<PagedResult<FeedbackDto>> GetFeedback(Guid id, [FromQuery] FeedbackQuery query, CancellationToken ct) =>
        feedback.ListAsync(id, query, ct);

    [HttpPost("{id:guid}/feedback")]
    public async Task<ActionResult<FeedbackDto>> AddFeedback(Guid id, CreateFeedbackRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await feedback.AddAsync(id, request, ct));

    [HttpDelete("feedback/{feedbackId:guid}")]
    public async Task<IActionResult> DeleteFeedback(Guid feedbackId, CancellationToken ct)
    {
        await feedback.DeleteAsync(feedbackId, ct);
        return NoContent();
    }
}

using BOF2.Application.Common;
using BOF2.Application.Feedbacks;
using BOF2.Domain.Entities;
using BOF2.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace BOF2.Infrastructure.Services;

public class FeedbackService(
    AppDbContext db,
    ICurrentUser currentUser,
    IValidator<CreateFeedbackRequest> validator) : IFeedbackService
{
    public async Task<PagedResult<FeedbackDto>> ListAsync(Guid postId, FeedbackQuery query, CancellationToken ct = default)
    {
        await EnsurePostExistsAsync(postId, ct);

        var feedbacks = db.Feedbacks.AsNoTracking().Where(f => f.PostId == postId);
        var total = await feedbacks.CountAsync(ct);
        var page = await feedbacks
            .OrderByDescending(f => f.CreatedAt)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .ToListAsync(ct);

        var authors = await db.LoadAuthorsAsync(page.Select(f => f.UserId), ct);
        var items = page.Select(f => ToDto(f, authors[f.UserId])).ToList();
        return new PagedResult<FeedbackDto>(items, query.Page, query.PageSize, total);
    }

    public async Task<FeedbackDto> AddAsync(Guid postId, CreateFeedbackRequest request, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await validator.ValidateAndThrowAsync(request, ct);
        await EnsurePostExistsAsync(postId, ct);

        var feedback = new Feedback { PostId = postId, UserId = userId, Content = request.Content.Trim() };
        db.Feedbacks.Add(feedback);
        await db.SaveChangesAsync(ct);

        var authors = await db.LoadAuthorsAsync([userId], ct);
        return ToDto(feedback, authors[userId]);
    }

    public async Task DeleteAsync(Guid feedbackId, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        var feedback = await db.Feedbacks.FirstOrDefaultAsync(f => f.Id == feedbackId, ct)
                       ?? throw new NotFoundException("Feedback not found.");

        if (feedback.UserId != userId && !currentUser.IsAdmin)
            throw new ForbiddenException();

        db.Feedbacks.Remove(feedback);
        await db.SaveChangesAsync(ct);
    }

    private async Task EnsurePostExistsAsync(Guid postId, CancellationToken ct)
    {
        if (!await db.Posts.AnyAsync(p => p.Id == postId, ct))
            throw new NotFoundException("Post not found.");
    }

    private static FeedbackDto ToDto(Feedback f, AuthorDto author) =>
        new(f.Id, f.PostId, f.Content, f.CreatedAt, author);
}

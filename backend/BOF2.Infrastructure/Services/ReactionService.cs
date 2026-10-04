using BOF2.Application.Common;
using BOF2.Application.Reactions;
using BOF2.Domain.Entities;
using BOF2.Domain.Enums;
using BOF2.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BOF2.Infrastructure.Services;

public class ReactionService(
    AppDbContext db,
    ICurrentUser currentUser,
    IValidator<SetReactionRequest> validator) : IReactionService
{
    public async Task<ReactionSummaryDto> SetAsync(Guid postId, SetReactionRequest request, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await validator.ValidateAndThrowAsync(request, ct);
        await EnsurePostExistsAsync(postId, ct);

        var reaction = await db.Reactions.FirstOrDefaultAsync(r => r.PostId == postId && r.UserId == userId, ct);
        if (reaction is null)
            db.Reactions.Add(new Reaction { PostId = postId, UserId = userId, Type = request.Type });
        else
            reaction.Type = request.Type;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // A parallel request (e.g. double click) inserted first; update that row instead.
            db.ChangeTracker.Clear();
            await db.Reactions.Where(r => r.PostId == postId && r.UserId == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.Type, request.Type), ct);
        }

        return await SummaryAsync(postId, userId, ct);
    }

    public async Task<ReactionSummaryDto> RemoveAsync(Guid postId, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await EnsurePostExistsAsync(postId, ct);

        await db.Reactions.Where(r => r.PostId == postId && r.UserId == userId).ExecuteDeleteAsync(ct);
        return await SummaryAsync(postId, userId, ct);
    }

    private async Task EnsurePostExistsAsync(Guid postId, CancellationToken ct)
    {
        if (!await db.Posts.AnyAsync(p => p.Id == postId, ct))
            throw new NotFoundException("Post not found.");
    }

    private async Task<ReactionSummaryDto> SummaryAsync(Guid postId, Guid userId, CancellationToken ct)
    {
        var reactions = await db.Reactions.AsNoTracking()
            .Where(r => r.PostId == postId)
            .Select(r => new { r.Type, r.UserId })
            .ToListAsync(ct);

        return new ReactionSummaryDto(
            reactions.GroupBy(r => r.Type).ToDictionary(g => g.Key, g => g.Count()),
            reactions.Where(r => r.UserId == userId).Select(r => (ReactionType?)r.Type).FirstOrDefault());
    }
}

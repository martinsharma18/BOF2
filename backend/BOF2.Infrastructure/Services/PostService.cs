using BOF2.Application.Common;
using BOF2.Application.Posts;
using BOF2.Domain.Entities;
using BOF2.Domain.Enums;
using BOF2.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace BOF2.Infrastructure.Services;

public class PostService(
    AppDbContext db,
    ICurrentUser currentUser,
    IFileStorage fileStorage,
    IValidator<PostFormRequest> validator) : IPostService
{
    private const string MediaFolder = "posts";

    public async Task<PagedResult<PostDto>> GetFeedAsync(PostQuery query, CancellationToken ct = default)
    {
        var posts = ApplyFilters(db.Posts.AsNoTracking(), query);

        // Full Type 1 posts leave the feed; their company and admins still see them (marked closed).
        if (!currentUser.IsAdmin)
        {
            var viewerId = currentUser.UserId;
            const int perPerson = PostTypeRules.ApplicationsPerPersonNeeded;
            posts = posts.Where(p => p.Type != PostType.Type1
                                     || p.AuthorId == viewerId
                                     || p.Applications.Count() < p.MinimumNumber * perPerson);
        }

        var total = await posts.CountAsync(ct);
        var page = await posts
            .OrderByDescending(p => p.CreatedAt)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<PostDto>(await ToDtosAsync(page, ct), query.Page, query.PageSize, total);
    }

    public async Task<PostDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var post = await db.Posts.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct)
                   ?? throw new NotFoundException("Post not found.");
        return (await ToDtosAsync([post], ct))[0];
    }

    public async Task<PostDto> CreateAsync(PostFormRequest request, FileUpload? media, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await validator.ValidateAndThrowAsync(request, ct);
        if (media is not null) ImageRules.EnsureValid(media, "Media");

        var post = new Post { AuthorId = userId };
        Apply(post, request);

        if (media is not null)
            post.MediaUrl = await fileStorage.SaveAsync(media, MediaFolder, ct);

        try
        {
            db.Posts.Add(post);
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            await fileStorage.DeleteAsync(post.MediaUrl, ct);
            throw;
        }

        return await GetByIdAsync(post.Id, ct);
    }

    public async Task<PostDto> UpdateAsync(Guid id, PostFormRequest request, FileUpload? media, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id, ct)
                   ?? throw new NotFoundException("Post not found.");
        if (post.AuthorId != userId)
            throw new ForbiddenException("Only the author can edit this post.");

        await validator.ValidateAndThrowAsync(request, ct);
        if (media is not null) ImageRules.EnsureValid(media, "Media");

        Apply(post, request);
        post.UpdatedAt = DateTime.UtcNow;

        var oldMedia = post.MediaUrl;
        string? newMedia = null;
        if (media is not null)
            post.MediaUrl = newMedia = await fileStorage.SaveAsync(media, MediaFolder, ct);
        else if (request.RemoveMedia)
            post.MediaUrl = null;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            await fileStorage.DeleteAsync(newMedia, ct);
            throw;
        }

        if (oldMedia != post.MediaUrl)
            await fileStorage.DeleteAsync(oldMedia, ct);

        return await GetByIdAsync(post.Id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        var post = await db.Posts.FirstOrDefaultAsync(p => p.Id == id, ct)
                   ?? throw new NotFoundException("Post not found.");

        if (post.AuthorId != userId && !currentUser.IsAdmin)
            throw new ForbiddenException();

        if (await db.Payments.AnyAsync(p => p.Application.PostId == id, ct))
            throw new ForbiddenException("This post has payments recorded against it, so it can't be deleted.");

        db.Posts.Remove(post);
        await db.SaveChangesAsync(ct);
        await fileStorage.DeleteAsync(post.MediaUrl, ct);
    }

    private static void Apply(Post post, PostFormRequest request)
    {
        post.Type = request.Type;
        post.Option = request.Type == PostType.Type1 ? request.Option : null;
        post.Title = request.Title.Trim();
        // Type 2 posts don't ask for gender or number of people: store "both" and 1.
        var isType2 = request.Type == PostType.Type2;
        post.GenderPreference = (isType2 || request.AcceptsMale ? GenderPreference.Male : GenderPreference.None)
                                | (isType2 || request.AcceptsFemale ? GenderPreference.Female : GenderPreference.None);
        post.MinimumNumber = isType2 ? 1 : request.MinimumNumber;
        post.MaximumPayment = request.MaximumPayment;
        post.ContactNumber = request.ContactNumber.Trim();
        post.WitnessContactNumber = request.WitnessContactNumber.Trim();
        post.IsFromAnywhere = request.IsFromAnywhere;
        post.Province = request.IsFromAnywhere ? null : request.Province;
        post.District = request.IsFromAnywhere || string.IsNullOrWhiteSpace(request.District) ? null : request.District;
        post.LocalLevel = post.District is null || string.IsNullOrWhiteSpace(request.LocalLevel) ? null : request.LocalLevel;
        post.Requirement = request.Requirement.Trim();
    }

    private static IQueryable<Post> ApplyFilters(IQueryable<Post> posts, PostQuery query)
    {
        if (query.AuthorId is { } authorId)
            posts = posts.Where(p => p.AuthorId == authorId);

        if (query.Type is { } type)
            posts = posts.Where(p => p.Type == type);

        // A location filter matches posts for that exact place, posts for the wider area around it
        // (whole district / whole province) and posts open to "anywhere".
        var province = query.Province;
        if (string.IsNullOrWhiteSpace(province) && !string.IsNullOrWhiteSpace(query.District))
            province = BOF2.Domain.NepalLocations.Provinces.FirstOrDefault(p => p.Value.Contains(query.District)).Key;

        if (!string.IsNullOrWhiteSpace(query.LocalLevel) && !string.IsNullOrWhiteSpace(query.District))
            posts = posts.Where(p => p.IsFromAnywhere
                || p.LocalLevel == query.LocalLevel
                || (p.District == query.District && p.LocalLevel == null)
                || (p.Province == province && p.District == null));
        else if (!string.IsNullOrWhiteSpace(query.District))
            posts = posts.Where(p => p.IsFromAnywhere
                || p.District == query.District
                || (p.Province == province && p.District == null));
        else if (!string.IsNullOrWhiteSpace(province))
            posts = posts.Where(p => p.IsFromAnywhere || p.Province == province);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = Projections.ToLikePattern(query.Search);
            posts = posts.Where(p =>
                EF.Functions.ILike(p.Title, pattern) ||
                EF.Functions.ILike(p.Requirement, pattern) ||
                EF.Functions.ILike(p.Author.FullName, pattern) ||
                (p.Author.CompanyProfile != null && EF.Functions.ILike(p.Author.CompanyProfile.CompanyName, pattern)));
        }

        return posts;
    }

    private async Task<List<PostDto>> ToDtosAsync(IReadOnlyList<Post> posts, CancellationToken ct)
    {
        if (posts.Count == 0) return [];

        var ids = posts.Select(p => p.Id).ToList();
        var authors = await db.LoadAuthorsAsync(posts.Select(p => p.AuthorId), ct);

        var reactionCounts = (await db.Reactions.AsNoTracking()
                .Where(r => ids.Contains(r.PostId))
                .GroupBy(r => new { r.PostId, r.Type })
                .Select(g => new { g.Key.PostId, g.Key.Type, Count = g.Count() })
                .ToListAsync(ct))
            .ToLookup(x => x.PostId);

        var feedbackCounts = await db.Feedbacks.AsNoTracking()
            .Where(f => ids.Contains(f.PostId))
            .GroupBy(f => f.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count, ct);

        var applicationCounts = await db.Applications.AsNoTracking()
            .Where(a => ids.Contains(a.PostId))
            .GroupBy(a => a.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count, ct);

        var mine = currentUser.UserId is { } userId
            ? await db.Reactions.AsNoTracking()
                .Where(r => ids.Contains(r.PostId) && r.UserId == userId)
                .ToDictionaryAsync(r => r.PostId, r => r.Type, ct)
            : [];

        var myApplications = currentUser.UserId is { } applicantId
            ? await db.Applications.AsNoTracking()
                .Where(a => ids.Contains(a.PostId) && a.ApplicantId == applicantId)
                .Select(a => new
                {
                    a.PostId,
                    Summary = new MyApplicationDto(a.Id, a.Status, a.ClaimedAmount, a.Payments.Sum(x => (decimal?)x.Amount) ?? 0, a.ClaimDeclineReason),
                })
                .ToDictionaryAsync(a => a.PostId, a => a.Summary, ct)
            : [];

        return posts.Select(p => new PostDto(
            p.Id, p.Type, p.Option, p.Title, p.MediaUrl,
            p.GenderPreference.HasFlag(GenderPreference.Male),
            p.GenderPreference.HasFlag(GenderPreference.Female),
            p.MinimumNumber, p.MaximumPayment, p.ContactNumber, p.WitnessContactNumber, p.IsFromAnywhere, p.Province, p.District, p.LocalLevel,
            p.Requirement, p.CreatedAt, p.UpdatedAt,
            authors[p.AuthorId],
            reactionCounts[p.Id].ToDictionary(c => c.Type, c => c.Count),
            mine.TryGetValue(p.Id, out var my) ? my : null,
            feedbackCounts.GetValueOrDefault(p.Id),
            applicationCounts.GetValueOrDefault(p.Id),
            PostTypeRules.ApplicationLimit(p.Type, p.MinimumNumber),
            PostTypeRules.ApplicationLimit(p.Type, p.MinimumNumber) is { } limit && applicationCounts.GetValueOrDefault(p.Id) >= limit,
            myApplications.GetValueOrDefault(p.Id))).ToList();
    }
}

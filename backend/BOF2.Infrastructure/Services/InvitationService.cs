using BOF2.Application.Common;
using BOF2.Application.Invitations;
using BOF2.Domain.Entities;
using BOF2.Domain.Enums;
using BOF2.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace BOF2.Infrastructure.Services;

public class InvitationService(
    AppDbContext db,
    ICurrentUser currentUser,
    IValidator<InvitationAudience> audienceValidator,
    IValidator<SendInvitationRequest> sendValidator) : IInvitationService
{
    /// <summary>Stops one company from flooding everyone's notifications.</summary>
    public const int DailyLimit = 10;

    public async Task<AudienceCountDto> CountAudienceAsync(InvitationAudience audience, CancellationToken ct = default)
    {
        await audienceValidator.ValidateAndThrowAsync(audience, ct);
        return new AudienceCountDto(await Recipients(audience).CountAsync(ct));
    }

    public async Task<InvitationDto> SendAsync(SendInvitationRequest request, CancellationToken ct = default)
    {
        var companyId = currentUser.RequireUserId();
        await sendValidator.ValidateAndThrowAsync(request, ct);

        string? postTitle = null;
        if (request.PostId is { } postId)
        {
            postTitle = await db.Posts.Where(p => p.Id == postId && p.AuthorId == companyId).Select(p => p.Title).FirstOrDefaultAsync(ct)
                        ?? throw Error("PostId", "Choose one of your own posts.");
        }

        var since = DateTime.UtcNow.AddDays(-1);
        if (await db.Invitations.CountAsync(i => i.CompanyId == companyId && i.CreatedAt > since, ct) >= DailyLimit)
            throw Error("Title", $"You can send up to {DailyLimit} invitations a day. Please try again tomorrow.");

        var recipientIds = await Recipients(request).Select(u => u.Id).ToListAsync(ct);
        if (recipientIds.Count == 0)
            throw Error("Province", "No individuals match these filters. Widen the location, gender or age.");

        var invitation = new Invitation
        {
            CompanyId = companyId,
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            PostId = request.PostId,
            Province = NullIfBlank(request.Province),
            District = NullIfBlank(request.District),
            LocalLevel = NullIfBlank(request.LocalLevel),
            Gender = request.Gender,
            MinAge = request.MinAge,
            MaxAge = request.MaxAge,
            RecipientCount = recipientIds.Count,
        };
        db.Invitations.Add(invitation);

        db.InboxItems.AddRange(recipientIds.Select(userId => new InboxItem
        {
            UserId = userId,
            Kind = InboxItemKind.Invitation,
            InvitationId = invitation.Id,
        }));

        await db.SaveChangesAsync(ct);
        return ToDto(invitation, postTitle);
    }

    public async Task<IReadOnlyList<InvitationDto>> ListMineAsync(CancellationToken ct = default)
    {
        var companyId = currentUser.RequireUserId();
        var rows = await db.Invitations.AsNoTracking()
            .Where(i => i.CompanyId == companyId)
            .OrderByDescending(i => i.CreatedAt)
            .Take(50)
            .Select(i => new { Invitation = i, PostTitle = i.Post != null ? i.Post.Title : null })
            .ToListAsync(ct);
        return rows.Select(r => ToDto(r.Invitation, r.PostTitle)).ToList();
    }

    /// <summary>Active individual accounts matching the filters.</summary>
    private IQueryable<AppUser> Recipients(InvitationAudience a)
    {
        var users = db.Users.Where(u => u.AccountType == AccountType.Individual && !u.IsDisabled && u.IndividualProfile != null);

        if (!string.IsNullOrEmpty(a.Province))
            users = users.Where(u => u.IndividualProfile!.Province == a.Province);
        if (!string.IsNullOrEmpty(a.District))
            users = users.Where(u => u.IndividualProfile!.District == a.District);
        if (!string.IsNullOrEmpty(a.LocalLevel))
            users = users.Where(u => u.IndividualProfile!.LocalLevel == a.LocalLevel);
        if (a.Gender is { } gender)
            users = users.Where(u => u.IndividualProfile!.Gender == gender);

        // Age filters only match people who entered a date of birth.
        var today = Age.Today;
        if (a.MinAge is { } min)
        {
            var bornOnOrBefore = today.AddYears(-min);
            users = users.Where(u => u.IndividualProfile!.DateOfBirth != null && u.IndividualProfile.DateOfBirth <= bornOnOrBefore);
        }
        if (a.MaxAge is { } max)
        {
            var bornAfter = today.AddYears(-(max + 1));
            users = users.Where(u => u.IndividualProfile!.DateOfBirth != null && u.IndividualProfile.DateOfBirth > bornAfter);
        }

        return users;
    }

    private static InvitationDto ToDto(Invitation i, string? postTitle) =>
        new(i.Id, i.Title, i.Message, i.PostId, postTitle, i.Province, i.District, i.LocalLevel,
            i.Gender, i.MinAge, i.MaxAge, i.RecipientCount, i.CreatedAt);

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static FieldErrorsException Error(string field, string message) =>
        new(new Dictionary<string, string[]> { [field] = [message] });
}

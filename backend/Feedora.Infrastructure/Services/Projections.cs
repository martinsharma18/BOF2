using System.Linq.Expressions;
using Feedora.Application.Common;
using Feedora.Domain.Entities;
using Feedora.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Feedora.Infrastructure.Services;

internal static class Projections
{
    public static readonly Expression<Func<AppUser, AuthorDto>> Author = u => new AuthorDto(
        u.Id,
        u.FullName,
        u.AccountType,
        u.CompanyProfile != null ? u.CompanyProfile.CompanyName : null,
        u.AvatarUrl);

    /// <summary>Loads author cards for a set of user ids in one query.</summary>
    public static async Task<Dictionary<Guid, AuthorDto>> LoadAuthorsAsync(
        this AppDbContext db, IEnumerable<Guid> userIds, CancellationToken ct)
    {
        var ids = userIds.Distinct().ToList();
        return await db.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .Select(Author)
            .ToDictionaryAsync(a => a.Id, ct);
    }

    /// <summary>Escapes LIKE wildcards so user input is matched literally.</summary>
    public static string ToLikePattern(string term) =>
        "%" + term.Trim().Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_") + "%";
}

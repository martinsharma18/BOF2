using Feedora.Domain.Enums;

namespace Feedora.Application.Common;

/// <summary>Minimal public info about the user behind a post or feedback.</summary>
public record AuthorDto(Guid Id, string FullName, AccountType AccountType, string? CompanyName, string? AvatarUrl)
{
    public string DisplayName => CompanyName ?? FullName;
}

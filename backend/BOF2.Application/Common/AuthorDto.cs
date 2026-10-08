using BOF2.Domain.Enums;

namespace BOF2.Application.Common;

public record AuthorDto(Guid Id, string FullName, AccountType AccountType, string? CompanyName, string? AvatarUrl)
{
    public string DisplayName => CompanyName ?? FullName;
}

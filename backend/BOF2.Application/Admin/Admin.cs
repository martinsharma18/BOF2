using BOF2.Application.Common;
using BOF2.Domain.Enums;

namespace BOF2.Application.Admin;

public record AdminStatsDto(
    int TotalUsers,
    int Companies,
    int Individuals,
    int NewUsersLast7Days,
    int TotalPosts,
    int PostsLast7Days,
    int TotalReactions,
    int TotalFeedback,
    int ActiveAds,
    int TotalApplications,
    int PendingWithdrawals,
    decimal PendingWithdrawalAmount,
    decimal TotalPaidOut);

public record AdminUserDto(
    Guid Id,
    string FullName,
    string Email,
    string? PhoneNumber,
    AccountType AccountType,
    string? CompanyName,
    bool IsDisabled,
    DateTime CreatedAt,
    int PostCount,
    /// <summary>Companies: photo of the registration certificate / PAN document (null for older accounts).</summary>
    string? RegistrationDocumentUrl);

public class AdminUserQuery : PageQuery
{
    public string? Search { get; set; }
    public AccountType? AccountType { get; set; }
}

public interface IAdminService
{
    Task<AdminStatsDto> GetStatsAsync(CancellationToken ct = default);
    Task<PagedResult<AdminUserDto>> GetUsersAsync(AdminUserQuery query, CancellationToken ct = default);
    Task SetDisabledAsync(Guid userId, bool disabled, CancellationToken ct = default);
}

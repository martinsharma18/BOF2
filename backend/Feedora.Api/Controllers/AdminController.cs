using Feedora.Api.Infrastructure;
using Feedora.Application.Admin;
using Feedora.Application.Ads;
using Feedora.Application.Common;
using Feedora.Application.Wallet;
using Feedora.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Feedora.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = Roles.Admin)]
public class AdminController(IAdminService admin, IAdService ads, IWalletService wallet) : ControllerBase
{
    [HttpGet("stats")]
    public Task<AdminStatsDto> GetStats(CancellationToken ct) => admin.GetStatsAsync(ct);

    [HttpGet("users")]
    public Task<PagedResult<AdminUserDto>> GetUsers([FromQuery] AdminUserQuery query, CancellationToken ct) =>
        admin.GetUsersAsync(query, ct);

    public record SetUserStatusRequest(bool Disabled);

    [HttpPut("users/{id:guid}/status")]
    public async Task<IActionResult> SetUserStatus(Guid id, SetUserStatusRequest request, CancellationToken ct)
    {
        await admin.SetDisabledAsync(id, request.Disabled, ct);
        return NoContent();
    }

    [HttpGet("ads")]
    public Task<IReadOnlyList<AdDto>> GetAds(CancellationToken ct) => ads.ListAllAsync(ct);

    [HttpPost("ads")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public Task<AdDto> CreateAd([FromForm] AdFormRequest request, IFormFile? image, CancellationToken ct) =>
        image.WithUploadAsync(upload => ads.CreateAsync(request, upload, ct));

    [HttpPut("ads/{id:guid}")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public Task<AdDto> UpdateAd(Guid id, [FromForm] AdFormRequest request, IFormFile? image, CancellationToken ct) =>
        image.WithUploadAsync(upload => ads.UpdateAsync(id, request, upload, ct));

    [HttpGet("withdrawals")]
    public Task<PagedResult<WithdrawalDto>> GetWithdrawals([FromQuery] WithdrawalQuery query, CancellationToken ct) =>
        wallet.ListWithdrawalsAsync(query, ct);

    /// <summary>Mark a cash-out request as paid (money sent) or rejected.</summary>
    [HttpPut("withdrawals/{id:guid}")]
    public Task<WithdrawalDto> ProcessWithdrawal(Guid id, ProcessWithdrawalRequest request, CancellationToken ct) =>
        wallet.ProcessWithdrawalAsync(id, request, ct);

    [HttpDelete("ads/{id:guid}")]
    public async Task<IActionResult> DeleteAd(Guid id, CancellationToken ct)
    {
        await ads.DeleteAsync(id, ct);
        return NoContent();
    }
}

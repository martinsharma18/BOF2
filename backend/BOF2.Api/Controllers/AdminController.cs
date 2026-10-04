using Feedora.Api.Infrastructure;
using Feedora.Application.Admin;
using Feedora.Application.Ads;
using Feedora.Application.Common;
using Feedora.Application.Vacancies;
using Feedora.Application.Wallet;
using Feedora.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Feedora.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = Roles.Admin)]
public class AdminController(IAdminService admin, IAdService ads, IWalletService wallet, IVacancyService vacancies) : ControllerBase
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

    /// <summary>Flag a cash-out request as Pending, Paid (done, money sent) or Rejected.</summary>
    [HttpPut("withdrawals/{id:guid}")]
    public Task<WithdrawalDto> ProcessWithdrawal(Guid id, ProcessWithdrawalRequest request, CancellationToken ct) =>
        wallet.ProcessWithdrawalAsync(id, request, ct);

    [HttpGet("vacancies")]
    public Task<IReadOnlyList<VacancyDto>> GetVacancies(CancellationToken ct) => vacancies.ListAllAsync(ct);

    [HttpPost("vacancies")]
    public Task<VacancyDto> CreateVacancy(VacancyRequest request, CancellationToken ct) => vacancies.CreateAsync(request, ct);

    [HttpPut("vacancies/{id:guid}")]
    public Task<VacancyDto> UpdateVacancy(Guid id, VacancyRequest request, CancellationToken ct) =>
        vacancies.UpdateAsync(id, request, ct);

    [HttpDelete("vacancies/{id:guid}")]
    public async Task<IActionResult> DeleteVacancy(Guid id, CancellationToken ct)
    {
        await vacancies.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpDelete("ads/{id:guid}")]
    public async Task<IActionResult> DeleteAd(Guid id, CancellationToken ct)
    {
        await ads.DeleteAsync(id, ct);
        return NoContent();
    }
}

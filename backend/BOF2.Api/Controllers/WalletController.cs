using BOF2.Application.Wallet;
using BOF2.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BOF2.Api.Controllers;

/// <summary>Individual earnings from companies and cash-out requests handled by the admin.</summary>
[ApiController]
[Route("api/wallet")]
[Authorize(Roles = Roles.Individual)]
public class WalletController(IWalletService wallet) : ControllerBase
{
    [HttpGet]
    public Task<WalletDto> Get(CancellationToken ct) => wallet.GetMineAsync(ct);

    [HttpPost("withdrawals")]
    public async Task<ActionResult<WithdrawalDto>> Withdraw(WithdrawRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await wallet.RequestWithdrawalAsync(request, ct));
}

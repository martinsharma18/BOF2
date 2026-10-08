using BOF2.Application.Ads;
using BOF2.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace BOF2.Api.Controllers;

[ApiController]
[Route("api/ads")]
public class AdsController(IAdService ads) : ControllerBase
{
    [HttpGet]
    [ResponseCache(Duration = 60)]
    public Task<IReadOnlyList<AdDto>> GetActive(AdPlacement placement, int count = 3, CancellationToken ct = default) =>
        ads.GetActiveAsync(placement, count, ct);
}

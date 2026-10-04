using Feedora.Application.Ads;
using Feedora.Domain.Enums;
using Microsoft.AspNetCore.Mvc;

namespace Feedora.Api.Controllers;

[ApiController]
[Route("api/ads")]
public class AdsController(IAdService ads) : ControllerBase
{
    /// <summary>Currently running ads for an advertising space.</summary>
    [HttpGet]
    [ResponseCache(Duration = 60)]
    public Task<IReadOnlyList<AdDto>> GetActive(AdPlacement placement, int count = 3, CancellationToken ct = default) =>
        ads.GetActiveAsync(placement, count, ct);
}

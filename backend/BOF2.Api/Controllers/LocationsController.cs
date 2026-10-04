using BOF2.Application.Locations;
using Microsoft.AspNetCore.Mvc;

namespace BOF2.Api.Controllers;

[ApiController]
[Route("api/locations")]
public class LocationsController(ILocationService locations) : ControllerBase
{
    /// <summary>Provinces with their districts and local levels (from the database), for the location dropdowns.</summary>
    [HttpGet("provinces")]
    [ResponseCache(Duration = 86400)]
    public Task<IReadOnlyList<ProvinceDto>> GetProvinces(CancellationToken ct) => locations.GetProvincesAsync(ct);
}

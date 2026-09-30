using Feedora.Application.Locations;
using Feedora.Domain;
using Microsoft.AspNetCore.Mvc;

namespace Feedora.Api.Controllers;

[ApiController]
[Route("api/locations")]
public class LocationsController : ControllerBase
{
    /// <summary>Provinces with their districts, for the Province / District dropdowns.</summary>
    [HttpGet("provinces")]
    [ResponseCache(Duration = 86400)]
    public IEnumerable<ProvinceDto> GetProvinces() =>
        NepalLocations.Provinces.Select(p => new ProvinceDto(p.Key, p.Value));
}

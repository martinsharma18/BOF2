using BOF2.Application.Locations;
using BOF2.Domain;
using BOF2.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BOF2.Infrastructure.Services;

/// <summary>Provinces → districts → local levels. Local levels are read from the database and cached.</summary>
public class LocationService(AppDbContext db, IMemoryCache cache) : ILocationService
{
    public async Task<IReadOnlyList<ProvinceDto>> GetProvincesAsync(CancellationToken ct = default) =>
        (await cache.GetOrCreateAsync("locations:provinces", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(6);
            var levels = await db.LocalLevels.AsNoTracking()
                .OrderBy(l => l.Name)
                .Select(l => new { l.District, l.Name })
                .ToListAsync(ct);
            var byDistrict = levels.GroupBy(l => l.District).ToDictionary(g => g.Key, g => g.Select(l => l.Name).ToArray());

            return (IReadOnlyList<ProvinceDto>)NepalLocations.Provinces.Select(p => new ProvinceDto(
                p.Key,
                p.Value,
                p.Value.ToDictionary(d => d, d => byDistrict.GetValueOrDefault(d) ?? []))).ToList();
        }))!;
}

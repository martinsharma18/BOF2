namespace Feedora.Application.Locations;

/// <summary>A province, its districts, and each district's local levels (municipalities / rural municipalities).</summary>
public interface ILocationService
{
    Task<IReadOnlyList<ProvinceDto>> GetProvincesAsync(CancellationToken ct = default);
}

public record ProvinceDto(string Name, IReadOnlyList<string> Districts, IReadOnlyDictionary<string, string[]> LocalLevels);

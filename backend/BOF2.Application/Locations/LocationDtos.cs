namespace BOF2.Application.Locations;

public interface ILocationService
{
    Task<IReadOnlyList<ProvinceDto>> GetProvincesAsync(CancellationToken ct = default);
}

public record ProvinceDto(string Name, IReadOnlyList<string> Districts, IReadOnlyDictionary<string, string[]> LocalLevels);

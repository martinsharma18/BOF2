namespace Feedora.Domain.Entities;

/// <summary>Extra details for User A (company) accounts.</summary>
public class CompanyProfile
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public string CompanyName { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    /// <summary>Optional: null means the whole province.</summary>
    public string? District { get; set; }
    public string? LocalLevel { get; set; }
}

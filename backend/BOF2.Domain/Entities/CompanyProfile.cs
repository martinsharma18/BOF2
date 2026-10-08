namespace BOF2.Domain.Entities;

public class CompanyProfile
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public string CompanyName { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    /// <summary>Optional: null means the whole province.</summary>
    public string? District { get; set; }
    public string? LocalLevel { get; set; }

    /// <summary>Photo of the company registration certificate or PAN document, for admins to verify. Null for older accounts.</summary>
    public string? RegistrationDocumentUrl { get; set; }
}

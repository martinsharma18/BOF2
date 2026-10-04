using BOF2.Domain.Enums;

namespace BOF2.Domain.Entities;

/// <summary>Extra details for User B (individual) accounts.</summary>
public class IndividualProfile
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public Gender Gender { get; set; }
    public string? SocialMediaLink { get; set; }
    public string Province { get; set; } = string.Empty;
    /// <summary>Optional: null means the whole province.</summary>
    public string? District { get; set; }

    /// <summary>Municipality / rural municipality inside the district. Null for accounts made before local levels existed.</summary>
    public string? LocalLevel { get; set; }

    /// <summary>Used for the age filter when companies send invitations.</summary>
    public DateOnly? DateOfBirth { get; set; }
    public string? AdditionalPhoneNumber { get; set; }
}

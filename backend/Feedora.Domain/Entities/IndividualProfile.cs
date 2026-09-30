using Feedora.Domain.Enums;

namespace Feedora.Domain.Entities;

/// <summary>Extra details for User B (individual) accounts.</summary>
public class IndividualProfile
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public Gender Gender { get; set; }
    public string? SocialMediaLink { get; set; }
    public string Province { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string? AdditionalPhoneNumber { get; set; }
}

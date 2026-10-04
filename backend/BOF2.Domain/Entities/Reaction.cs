using Feedora.Domain.Enums;

namespace Feedora.Domain.Entities;

/// <summary>One reaction per user per post.</summary>
public class Reaction
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid PostId { get; set; }
    public Post Post { get; set; } = null!;

    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public ReactionType Type { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

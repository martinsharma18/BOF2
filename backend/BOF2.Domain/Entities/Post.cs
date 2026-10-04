using BOF2.Domain.Enums;

namespace BOF2.Domain.Entities;

public class Post
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AuthorId { get; set; }
    public AppUser Author { get; set; } = null!;

    public PostType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
    public GenderPreference GenderPreference { get; set; }
    public int MinimumNumber { get; set; }
    public decimal MaximumPayment { get; set; }

    /// <summary>Phone number people can call about this post.</summary>
    public string? ContactNumber { get; set; }

    /// <summary>Phone number of a witness who can vouch for the post.</summary>
    public string? WitnessContactNumber { get; set; }

    /// <summary>When true, Province/District are ignored ("From Anywhere").</summary>
    public bool IsFromAnywhere { get; set; }
    public string? Province { get; set; }
    public string? District { get; set; }
    public string? LocalLevel { get; set; }

    public string Requirement { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
    public ICollection<Feedback> Feedbacks { get; set; } = new List<Feedback>();
    public ICollection<PostApplication> Applications { get; set; } = new List<PostApplication>();
}

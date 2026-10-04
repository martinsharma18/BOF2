using BOF2.Application.Common;
using BOF2.Domain.Enums;

namespace BOF2.Application.Posts;

/// <summary>Feed filters. All are optional.</summary>
public class PostQuery : PageQuery
{
    public string? Search { get; set; }
    public PostType? Type { get; set; }
    public string? Province { get; set; }
    public string? District { get; set; }
    public string? LocalLevel { get; set; }
    public Guid? AuthorId { get; set; }
}

/// <summary>The post form (create and edit). Bound from multipart/form-data; the image is passed separately.</summary>
public class PostFormRequest
{
    public PostType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool AcceptsMale { get; set; }
    public bool AcceptsFemale { get; set; }
    public int MinimumNumber { get; set; }
    public decimal MaximumPayment { get; set; }
    public string ContactNumber { get; set; } = string.Empty;
    public string WitnessContactNumber { get; set; } = string.Empty;
    public bool IsFromAnywhere { get; set; }
    public string? Province { get; set; }
    public string? District { get; set; }
    public string? LocalLevel { get; set; }
    public string Requirement { get; set; } = string.Empty;

    /// <summary>Edit only: drop the current image without uploading a new one.</summary>
    public bool RemoveMedia { get; set; }
}

public record PostDto(
    Guid Id,
    PostType Type,
    string Title,
    string? MediaUrl,
    bool AcceptsMale,
    bool AcceptsFemale,
    int MinimumNumber,
    decimal MaximumPayment,
    string? ContactNumber,
    string? WitnessContactNumber,
    bool IsFromAnywhere,
    string? Province,
    string? District,
    string? LocalLevel,
    string Requirement,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    AuthorDto Author,
    IReadOnlyDictionary<ReactionType, int> ReactionCounts,
    ReactionType? MyReaction,
    int FeedbackCount,
    int ApplicationCount,
    MyApplicationDto? MyApplication);

/// <summary>The signed-in individual's own application on a post, so the card can show Apply / Claim state.</summary>
public record MyApplicationDto(Guid Id, ApplicationStatus Status, decimal? ClaimedAmount, decimal PaidAmount, string? ClaimDeclineReason);

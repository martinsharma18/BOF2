namespace BOF2.Domain.Enums;

public enum PostType
{
    Type1 = 1,
    Type2 = 2
}

/// <summary>What each post type allows. Change the rules here; the names shown to users live in the frontend.</summary>
public static class PostTypeRules
{
    /// <summary>
    /// Whether hired applicants claim payment and the company pays through the app.
    /// Off for Type 2: people apply, get hired and chat, but money is handled outside the app.
    /// </summary>
    public static bool UsesPayments(this PostType type) => type == PostType.Type1;

    /// <summary>Type 1 posts close after this many applications per person needed (5 people needed → 25 applications).</summary>
    public const int ApplicationsPerPersonNeeded = 5;

    /// <summary>
    /// How many applications a post takes before it closes: hidden from the feed and no new applications.
    /// Null means no limit (Type 2).
    /// </summary>
    public static int? ApplicationLimit(PostType type, int minimumNumber) =>
        type == PostType.Type1 ? minimumNumber * ApplicationsPerPersonNeeded : null;
}

/// <summary>Sub-choice for Type 1 posts (A or B). Rename the labels in the frontend once their meaning is final.</summary>
public enum PostOption
{
    A = 1,
    B = 2
}

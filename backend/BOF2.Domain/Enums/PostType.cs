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
}

/// <summary>Sub-choice for Type 1 posts (A or B). Rename the labels in the frontend once their meaning is final.</summary>
public enum PostOption
{
    A = 1,
    B = 2
}

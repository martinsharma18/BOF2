namespace BOF2.Domain.Enums;

public enum PostType
{
    Type1 = 1,
    Type2 = 2
}

/// <summary>Sub-choice for Type 1 posts (A or B). Rename the labels in the frontend once their meaning is final.</summary>
public enum PostOption
{
    A = 1,
    B = 2
}

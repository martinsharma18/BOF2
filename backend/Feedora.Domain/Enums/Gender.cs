namespace Feedora.Domain.Enums;

public enum Gender
{
    Male = 1,
    Female = 2
}

/// <summary>Which genders a post is open to (the M / F checkboxes on the post form).</summary>
[Flags]
public enum GenderPreference
{
    None = 0,
    Male = 1,
    Female = 2,
    Any = Male | Female
}

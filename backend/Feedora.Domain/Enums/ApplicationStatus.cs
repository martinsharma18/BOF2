namespace Feedora.Domain.Enums;

/// <summary>How an individual responded to a post.</summary>
public enum ApplicationKind
{
    /// <summary>Applied with a written message.</summary>
    Apply = 1,

    /// <summary>Legacy one-tap application. Claim now means claiming payment after acceptance (see PostApplication.ClaimedAmount).</summary>
    Claim = 2
}

public enum ApplicationStatus
{
    Pending = 1,
    Accepted = 2,
    Rejected = 3
}

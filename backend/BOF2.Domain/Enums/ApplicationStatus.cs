namespace BOF2.Domain.Enums;

public enum ApplicationKind
{
    Apply = 1,

    /// <summary>Legacy one-tap application. Claim now means claiming payment after acceptance (see PostApplication.ClaimedAmount).</summary>
    Claim = 2
}

/// <summary>
/// One application is one job with one payment:
/// Pending (applied) → Accepted (hired) → claim payment once → Completed (paid). Rejected ends it.
/// </summary>
public enum ApplicationStatus
{
    Pending = 1,
    Accepted = 2,
    Rejected = 3,

    /// <summary>The company paid. Nothing more can happen on this application.</summary>
    Completed = 4
}

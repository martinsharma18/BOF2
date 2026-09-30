namespace Feedora.Domain.Enums;

/// <summary>The three kinds of users in the system.</summary>
public enum AccountType
{
    /// <summary>User A — a company that publishes requirement posts.</summary>
    Company = 1,

    /// <summary>User B — an individual.</summary>
    Individual = 2,

    /// <summary>User C — platform administrator.</summary>
    Admin = 3
}

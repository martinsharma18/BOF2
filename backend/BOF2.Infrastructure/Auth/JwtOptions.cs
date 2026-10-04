namespace Feedora.Infrastructure.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "Feedora";
    public string Audience { get; set; } = "Feedora";

    /// <summary>HMAC-SHA256 signing key; must be at least 32 characters.</summary>
    public string Key { get; set; } = string.Empty;

    public int AccessTokenMinutes { get; set; } = 30;
    public int RefreshTokenDays { get; set; } = 7;
}

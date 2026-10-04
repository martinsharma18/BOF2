using Npgsql;

namespace Feedora.Infrastructure.Persistence;

internal static class ConnectionString
{
    /// <summary>
    /// Accepts both Npgsql's "Host=...;Username=..." form and the "postgresql://user:pass@host/db?sslmode=require"
    /// link that Neon, Supabase and Render show, so the hosted value can be pasted as-is.
    /// </summary>
    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            !(value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
              value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)))
            return value;

        var uri = new Uri(value);
        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort || uri.Port <= 0 ? 5432 : uri.Port,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : null,
            // Hosted databases require TLS; a local link can say ?sslmode=disable.
            SslMode = SslMode.Require,
        };

        foreach (var pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var (key, val) = (pair.Split('=', 2)[0], pair.Contains('=') ? Uri.UnescapeDataString(pair.Split('=', 2)[1]) : "");
            if (key.Equals("sslmode", StringComparison.OrdinalIgnoreCase) && Enum.TryParse<SslMode>(val.Replace("-", ""), true, out var mode))
                builder.SslMode = mode;
        }

        return builder.ConnectionString;
    }
}

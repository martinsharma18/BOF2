namespace BOF2.Infrastructure.Services;

public static class SocialLinks
{
    /// <summary>
    /// Comparable form of a profile link: no scheme, no "www." / "m.", no trailing slash, lower case.
    /// "https://www.facebook.com/Martin/" and "http://m.facebook.com/martin" both become "facebook.com/martin".
    /// </summary>
    public static string Key(string link)
    {
        var text = link.Trim();
        if (!Uri.TryCreate(text, UriKind.Absolute, out var uri))
            return text.TrimEnd('/').ToLowerInvariant();

        var host = uri.Host.ToLowerInvariant();
        foreach (var prefix in new[] { "www.", "m.", "mobile." })
            if (host.StartsWith(prefix, StringComparison.Ordinal))
            {
                host = host[prefix.Length..];
                break;
            }

        return (host + uri.AbsolutePath.TrimEnd('/') + uri.Query).ToLowerInvariant();
    }
}

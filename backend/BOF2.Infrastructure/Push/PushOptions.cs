namespace BOF2.Infrastructure.Push;

/// <summary>
/// VAPID keys for Web Push (generate once per environment, e.g. <c>npx web-push generate-vapid-keys</c>).
/// Leave empty to turn phone notifications off; everything else keeps working.
/// </summary>
public class PushOptions
{
    public const string SectionName = "WebPush";

    public string PublicKey { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;

    /// <summary>Contact for push services if something goes wrong: "mailto:you@example.com" or a site URL.</summary>
    public string Subject { get; set; } = "mailto:admin@bof2.local";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(PublicKey) && !string.IsNullOrWhiteSpace(PrivateKey);
}

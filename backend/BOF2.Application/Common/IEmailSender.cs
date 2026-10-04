namespace BOF2.Application.Common;

public interface IEmailSender
{
    /// <summary>False when no email provider is configured and emails are only written to the log (development).</summary>
    bool IsLive { get; }

    Task SendAsync(string toEmail, string toName, string subject, string text, CancellationToken ct = default);
}

using System.Net;
using System.Net.Http.Json;
using BOF2.Application.Common;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace BOF2.Infrastructure.Email;

public class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>Brevo API key (xkeysib-...). When set, emails go through Brevo instead of SMTP.</summary>
    public string BrevoApiKey { get; set; } = string.Empty;

    /// <summary>Sender address. With Brevo it must be a verified sender in your Brevo account; with SMTP it defaults to SmtpUser.</summary>
    public string FromEmail { get; set; } = string.Empty;

    /// <summary>SMTP server. Gmail: smtp.gmail.com, port 587.</summary>
    public string SmtpHost { get; set; } = "smtp.gmail.com";
    public int SmtpPort { get; set; } = 587;

    /// <summary>The Gmail address that sends the emails. Leave empty to only log emails.</summary>
    public string SmtpUser { get; set; } = string.Empty;

    /// <summary>Gmail "App password" (16 letters), not the normal Gmail password.</summary>
    public string SmtpPassword { get; set; } = string.Empty;

    public string FromName { get; set; } = "BOF2";
}

/// <summary>Sends email over SMTP (Gmail with an app password by default: free, about 500 emails a day).</summary>
public class SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public bool IsLive => true;

    public async Task SendAsync(string toEmail, string toName, string subject, string text, CancellationToken ct = default)
    {
        var o = options.Value;
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(o.FromName, string.IsNullOrWhiteSpace(o.FromEmail) ? o.SmtpUser : o.FromEmail));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;
        message.Body = new BodyBuilder
        {
            TextBody = text,
            HtmlBody = EmailHtml.FromText(text),
        }.ToMessageBody();

        try
        {
            using var client = new SmtpClient { Timeout = 15_000 };
            await client.ConnectAsync(o.SmtpHost, o.SmtpPort, SecureSocketOptions.StartTlsWhenAvailable, ct);
            await client.AuthenticateAsync(o.SmtpUser, o.SmtpPassword.Replace(" ", ""), ct);
            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Sending email to {Email} failed", toEmail);
            throw new InvalidOperationException("Could not send the email. Try again in a minute.");
        }
    }
}

/// <summary>Sends email through Brevo's HTTP API (free plan: 300 emails a day). Works where SMTP ports are blocked.</summary>
public class BrevoEmailSender(HttpClient http, IOptions<EmailOptions> options, ILogger<BrevoEmailSender> logger) : IEmailSender
{
    public bool IsLive => true;

    public async Task SendAsync(string toEmail, string toName, string subject, string text, CancellationToken ct = default)
    {
        var o = options.Value;
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email")
        {
            Content = JsonContent.Create(new
            {
                sender = new { name = o.FromName, email = o.FromEmail },
                to = new[] { new { email = toEmail, name = toName } },
                subject,
                textContent = text,
                htmlContent = EmailHtml.FromText(text),
            }),
        };
        request.Headers.Add("api-key", o.BrevoApiKey.Trim());

        try
        {
            using var response = await http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                logger.LogError("Brevo rejected the email to {Email}: {Status} {Body}", toEmail, (int)response.StatusCode, body);
                throw new InvalidOperationException("Could not send the email. Try again in a minute.");
            }
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Sending email to {Email} through Brevo failed", toEmail);
            throw new InvalidOperationException("Could not send the email. Try again in a minute.");
        }
    }
}

internal static class EmailHtml
{
    public static string FromText(string text) =>
        $"<div style=\"font-family:sans-serif;font-size:15px;line-height:1.5\">{WebUtility.HtmlEncode(text).Replace("\n", "<br>")}</div>";
}

public class LogEmailSender(ILogger<LogEmailSender> logger) : IEmailSender
{
    public bool IsLive => false;

    public Task SendAsync(string toEmail, string toName, string subject, string text, CancellationToken ct = default)
    {
        logger.LogWarning("Email (not sent, no provider configured) to {Email}: {Subject}\n{Text}", toEmail, subject, text);
        return Task.CompletedTask;
    }
}

using System.Net;
using System.Text.Json;
using BOF2.Infrastructure.Persistence;
using Lib.Net.Http.WebPush;
using Lib.Net.Http.WebPush.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BOF2.Infrastructure.Push;

/// <summary>
/// Background worker: takes pushes from <see cref="PushQueue"/> and delivers them to each of the user's devices.
/// Devices the push service reports as gone (uninstalled, permission revoked) are deleted.
/// </summary>
public class PushSender(
    PushQueue queue,
    IServiceScopeFactory scopes,
    IHttpClientFactory httpClients,
    IOptions<PushOptions> options,
    ILogger<PushSender> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var client = CreateClient(options.Value);
        if (client is null)
        {
            // Keep draining so the queue never fills up; the rest of the API works without push.
            await foreach (var _ in queue.Reader.ReadAllAsync(stoppingToken)) { }
            return;
        }

        await foreach (var note in queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await SendAsync(client, note, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Push to user {UserId} failed", note.UserId);
            }
        }
    }

    private PushServiceClient? CreateClient(PushOptions config)
    {
        if (!config.IsConfigured)
        {
            logger.LogInformation("Web Push keys are not configured; phone notifications are off.");
            return null;
        }
        try
        {
            return new PushServiceClient(httpClients.CreateClient("webpush"))
            {
                DefaultAuthentication = new VapidAuthentication(config.PublicKey.Trim(), config.PrivateKey.Trim())
                {
                    Subject = string.IsNullOrWhiteSpace(config.Subject) ? "mailto:admin@bof2.local" : config.Subject.Trim(),
                },
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Web Push keys are invalid (check WebPush__PublicKey/PrivateKey/Subject); phone notifications are off.");
            return null;
        }
    }

    private async Task SendAsync(PushServiceClient client, PushNote note, CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var devices = await db.PushDevices.AsNoTracking().Where(d => d.UserId == note.UserId).ToListAsync(ct);
        if (devices.Count == 0) return;

        var payload = JsonSerializer.Serialize(new { title = note.Title, body = note.Body, url = note.Url, tag = note.Tag }, Json);
        var gone = new List<Guid>();

        foreach (var device in devices)
        {
            var subscription = new PushSubscription { Endpoint = device.Endpoint };
            subscription.SetKey(PushEncryptionKeyName.P256DH, device.P256dh);
            subscription.SetKey(PushEncryptionKeyName.Auth, device.Auth);

            try
            {
                await client.RequestPushMessageDeliveryAsync(subscription,
                    new PushMessage(payload) { TimeToLive = 60 * 60 * 24, Urgency = PushMessageUrgency.High }, ct);
            }
            catch (PushServiceClientException ex) when (ex.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
            {
                gone.Add(device.Id);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Push to device {DeviceId} failed", device.Id);
            }
        }

        if (gone.Count > 0)
            await db.PushDevices.Where(d => gone.Contains(d.Id)).ExecuteDeleteAsync(ct);
    }
}

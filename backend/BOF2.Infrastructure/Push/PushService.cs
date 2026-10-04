using BOF2.Application.Common;
using BOF2.Application.Push;
using BOF2.Domain.Entities;
using BOF2.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BOF2.Infrastructure.Push;

public class PushService(
    AppDbContext db,
    ICurrentUser currentUser,
    IOptions<PushOptions> options,
    IValidator<PushSubscribeRequest> validator) : IPushService
{
    public string? PublicKey => options.Value.IsConfigured ? options.Value.PublicKey : null;

    public async Task SubscribeAsync(PushSubscribeRequest request, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        var userId = currentUser.RequireUserId();

        // One row per device. If another account signed in on this phone before, it now belongs to this one.
        var device = await db.PushDevices.FirstOrDefaultAsync(d => d.Endpoint == request.Endpoint, ct);
        if (device is null)
        {
            device = new PushDevice { Endpoint = request.Endpoint };
            db.PushDevices.Add(device);
        }
        device.UserId = userId;
        device.P256dh = request.P256dh;
        device.Auth = request.Auth;
        await db.SaveChangesAsync(ct);
    }

    public async Task UnsubscribeAsync(PushUnsubscribeRequest request, CancellationToken ct = default)
    {
        var userId = currentUser.RequireUserId();
        await db.PushDevices
            .Where(d => d.Endpoint == request.Endpoint && d.UserId == userId)
            .ExecuteDeleteAsync(ct);
    }
}

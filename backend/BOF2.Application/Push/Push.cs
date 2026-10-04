using FluentValidation;

namespace BOF2.Application.Push;

/// <summary>A browser push subscription (from <c>PushSubscription.toJSON()</c>).</summary>
public record PushSubscribeRequest(string Endpoint, string P256dh, string Auth);

public record PushUnsubscribeRequest(string Endpoint);

public record PushPublicKeyDto(string? PublicKey);

public class PushSubscribeValidator : AbstractValidator<PushSubscribeRequest>
{
    public PushSubscribeValidator()
    {
        RuleFor(x => x.Endpoint).NotEmpty().MaximumLength(1000)
            .Must(e => Uri.TryCreate(e, UriKind.Absolute, out var uri) && uri.Scheme == Uri.UriSchemeHttps)
            .WithMessage("Invalid push endpoint.");
        RuleFor(x => x.P256dh).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Auth).NotEmpty().MaximumLength(100);
    }
}

public interface IPushService
{
    /// <summary>The VAPID public key browsers subscribe with; null when push isn't configured.</summary>
    string? PublicKey { get; }

    /// <summary>Links this device to the current user (moves it if someone else used it before).</summary>
    Task SubscribeAsync(PushSubscribeRequest request, CancellationToken ct = default);

    Task UnsubscribeAsync(PushUnsubscribeRequest request, CancellationToken ct = default);
}

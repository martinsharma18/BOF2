using System.Threading.Channels;

namespace Feedora.Infrastructure.Push;

/// <summary>What one push says. <see cref="Url"/> is the app route opened when it is tapped.</summary>
public record PushNote(Guid UserId, string Title, string? Body, string Url, string Tag);

/// <summary>
/// In-memory hand-off from requests to <see cref="PushSender"/>, so an API call never waits on Google/Apple/Mozilla
/// push servers. Bounded: under extreme load the oldest pending pushes are dropped (the in-app list still has them).
/// </summary>
public class PushQueue
{
    private readonly Channel<PushNote> channel = Channel.CreateBounded<PushNote>(
        new BoundedChannelOptions(20_000) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });

    public void Enqueue(PushNote note) => channel.Writer.TryWrite(note);

    public ChannelReader<PushNote> Reader => channel.Reader;
}

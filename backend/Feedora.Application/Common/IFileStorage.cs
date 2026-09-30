namespace Feedora.Application.Common;

public record FileUpload(Stream Content, string FileName, string ContentType, long Length);

public interface IFileStorage
{
    /// <summary>Saves the file and returns its public relative URL (e.g. /uploads/posts/abc.jpg).</summary>
    Task<string> SaveAsync(FileUpload file, string folder, CancellationToken ct = default);

    Task DeleteAsync(string? url, CancellationToken ct = default);
}

using Feedora.Application.Common;
using Microsoft.Extensions.Options;

namespace Feedora.Infrastructure.Storage;

public class FileStorageOptions
{
    /// <summary>Absolute folder that is served at <see cref="PublicBasePath"/>.</summary>
    public string RootPath { get; set; } = string.Empty;

    public string PublicBasePath { get; set; } = "/uploads";
}

/// <summary>Stores files on local disk. Swap for S3 / Azure Blob / Cloudinary later behind <see cref="IFileStorage"/>.</summary>
public class LocalFileStorage(IOptions<FileStorageOptions> options) : IFileStorage
{
    private readonly FileStorageOptions _options = options.Value;

    public async Task<string> SaveAsync(FileUpload file, string folder, CancellationToken ct = default)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var directory = Path.Combine(_options.RootPath, folder);
        Directory.CreateDirectory(directory);

        await using (var target = File.Create(Path.Combine(directory, fileName)))
        {
            await file.Content.CopyToAsync(target, ct);
        }

        return $"{_options.PublicBasePath}/{folder}/{fileName}";
    }

    public Task DeleteAsync(string? url, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(url) || !url.StartsWith(_options.PublicBasePath + "/", StringComparison.Ordinal))
            return Task.CompletedTask;

        var relative = url[(_options.PublicBasePath.Length + 1)..].Replace('/', Path.DirectorySeparatorChar);
        var root = Path.GetFullPath(_options.RootPath);
        var fullPath = Path.GetFullPath(Path.Combine(root, relative));

        // Guard against path traversal.
        if (fullPath.StartsWith(root, StringComparison.OrdinalIgnoreCase) && File.Exists(fullPath))
            File.Delete(fullPath);

        return Task.CompletedTask;
    }
}

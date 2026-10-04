using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Feedora.Application.Common;
using Microsoft.Extensions.Logging;

namespace Feedora.Infrastructure.Storage;

/// <summary>
/// Stores images on Cloudinary (used when <c>Cloudinary:Url</c> is set, e.g. on Render where the disk is wiped
/// on every deploy). Returned URLs ask Cloudinary for the best format and quality per device (f_auto,q_auto),
/// so phones get small WEBP/AVIF files.
/// </summary>
public class CloudinaryFileStorage(Cloudinary cloudinary, ILogger<CloudinaryFileStorage> logger) : IFileStorage
{
    private const string RootFolder = "feedora";
    private const string Delivery = "f_auto,q_auto";

    public async Task<string> SaveAsync(FileUpload file, string folder, CancellationToken ct = default)
    {
        var upload = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, file.Content),
            Folder = $"{RootFolder}/{folder}",
            UseFilename = false,
            UniqueFilename = true,
            Overwrite = false,
        };
        var result = await cloudinary.UploadAsync(upload, ct);
        if (result.Error is not null || result.SecureUrl is null)
            throw new InvalidOperationException($"Image upload failed: {result.Error?.Message}");

        return result.SecureUrl.ToString().Replace("/upload/", $"/upload/{Delivery}/");
    }

    public async Task DeleteAsync(string? url, CancellationToken ct = default)
    {
        var publicId = PublicIdFrom(url);
        if (publicId is null) return;
        try
        {
            await cloudinary.DestroyAsync(new DeletionParams(publicId) { ResourceType = ResourceType.Image });
        }
        catch (Exception ex)
        {
            // A leftover image is harmless; never fail the user's action over it.
            logger.LogWarning(ex, "Could not delete Cloudinary image {PublicId}", publicId);
        }
    }

    /// <summary>
    /// ".../image/upload/f_auto,q_auto/v1712/feedora/posts/abc.jpg" → "feedora/posts/abc".
    /// Returns null for anything that isn't one of our Cloudinary images (e.g. old /uploads/ paths).
    /// </summary>
    internal static string? PublicIdFrom(string? url)
    {
        if (string.IsNullOrEmpty(url) || !url.Contains("res.cloudinary.com", StringComparison.OrdinalIgnoreCase)) return null;
        var marker = url.IndexOf("/upload/", StringComparison.Ordinal);
        if (marker < 0) return null;

        // Everything we upload lives under "feedora/", after any transformation and version segments.
        var root = url.IndexOf($"/{RootFolder}/", marker, StringComparison.Ordinal);
        if (root < 0) return null;
        var path = url[(root + 1)..];
        var dot = path.LastIndexOf('.');
        return dot > 0 ? path[..dot] : path;
    }
}

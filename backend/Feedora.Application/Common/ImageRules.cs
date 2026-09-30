namespace Feedora.Application.Common;

/// <summary>Shared rules for uploaded images (post media, avatars, ads).</summary>
public static class ImageRules
{
    public const long MaxBytes = 5 * 1024 * 1024;
    public static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

    /// <summary>Throws a field error when <paramref name="file"/> is not an acceptable image.</summary>
    public static void EnsureValid(FileUpload file, string field)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        string? error = null;
        if (file.Length == 0) error = "The file is empty.";
        else if (file.Length > MaxBytes) error = "The image must be 5 MB or smaller.";
        else if (!AllowedExtensions.Contains(extension) ||
                 !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            error = "Only JPG, PNG, WEBP or GIF images are allowed.";

        if (error is not null)
            throw new FieldErrorsException(new Dictionary<string, string[]> { [field] = [error] });
    }
}

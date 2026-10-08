namespace BOF2.Application.Common;

public static class ImageRules
{
    public const long MaxBytes = 5 * 1024 * 1024;
    public static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

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

    /// <summary>A photo of an official document (company registration certificate, PAN): JPG or PNG only.</summary>
    public static void EnsureValidDocumentPhoto(FileUpload file, string field)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var contentType = file.ContentType.ToLowerInvariant();
        string? error = null;
        if (file.Length == 0) error = "The file is empty.";
        else if (file.Length > MaxBytes) error = "The photo must be 5 MB or smaller.";
        else if (extension is not (".jpg" or ".jpeg" or ".png") || contentType is not ("image/jpeg" or "image/png"))
            error = "Only a JPG or PNG photo is allowed.";

        if (error is not null)
            throw new FieldErrorsException(new Dictionary<string, string[]> { [field] = [error] });
    }

    /// <summary>Like <see cref="EnsureValid"/>, but a PDF is accepted too (proof of work, receipts).</summary>
    public static void EnsureValidImageOrPdf(FileUpload file, string field)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var isPdf = extension == ".pdf" && file.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase);
        var isImage = AllowedExtensions.Contains(extension) &&
                      file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);

        string? error = null;
        if (file.Length == 0) error = "The file is empty.";
        else if (file.Length > MaxBytes) error = "The file must be 5 MB or smaller.";
        else if (!isPdf && !isImage) error = "Only a photo (JPG, PNG, WEBP, GIF) or a PDF is allowed.";
        if (error is not null)
            throw new FieldErrorsException(new Dictionary<string, string[]> { [field] = [error] });
    }
}

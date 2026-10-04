using BOF2.Application.Common;

namespace BOF2.Api.Infrastructure;

public static class FormFileExtensions
{
    /// <summary>Runs <paramref name="action"/> with the upload (or null), keeping the stream open for its duration.</summary>
    public static async Task<T> WithUploadAsync<T>(this IFormFile? file, Func<FileUpload?, Task<T>> action)
    {
        if (file is null) return await action(null);

        await using var stream = file.OpenReadStream();
        return await action(new FileUpload(stream, file.FileName, file.ContentType, file.Length));
    }
}

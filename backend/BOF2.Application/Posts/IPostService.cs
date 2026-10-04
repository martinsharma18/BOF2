using BOF2.Application.Common;

namespace BOF2.Application.Posts;

public interface IPostService
{
    Task<PagedResult<PostDto>> GetFeedAsync(PostQuery query, CancellationToken ct = default);
    Task<PostDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PostDto> CreateAsync(PostFormRequest request, FileUpload? media, CancellationToken ct = default);
    Task<PostDto> UpdateAsync(Guid id, PostFormRequest request, FileUpload? media, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

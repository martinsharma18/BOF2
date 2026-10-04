using BOF2.Application.Common;
using FluentValidation;

namespace BOF2.Application.Feedbacks;

public record CreateFeedbackRequest(string Content);

public record FeedbackDto(Guid Id, Guid PostId, string Content, DateTime CreatedAt, AuthorDto Author);

public class FeedbackQuery : PageQuery;

public class CreateFeedbackValidator : AbstractValidator<CreateFeedbackRequest>
{
    public CreateFeedbackValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(2000);
    }
}

public interface IFeedbackService
{
    Task<PagedResult<FeedbackDto>> ListAsync(Guid postId, FeedbackQuery query, CancellationToken ct = default);
    Task<FeedbackDto> AddAsync(Guid postId, CreateFeedbackRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid feedbackId, CancellationToken ct = default);
}

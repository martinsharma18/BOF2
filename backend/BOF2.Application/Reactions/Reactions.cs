using BOF2.Domain.Enums;
using FluentValidation;

namespace BOF2.Application.Reactions;

public record SetReactionRequest(ReactionType Type);

public record ReactionSummaryDto(IReadOnlyDictionary<ReactionType, int> ReactionCounts, ReactionType? MyReaction);

public class SetReactionValidator : AbstractValidator<SetReactionRequest>
{
    public SetReactionValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
    }
}

public interface IReactionService
{
    Task<ReactionSummaryDto> SetAsync(Guid postId, SetReactionRequest request, CancellationToken ct = default);
    Task<ReactionSummaryDto> RemoveAsync(Guid postId, CancellationToken ct = default);
}

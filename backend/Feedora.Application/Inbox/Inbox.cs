using Feedora.Application.Common;
using Feedora.Application.Vacancies;
using Feedora.Domain.Enums;

namespace Feedora.Application.Inbox;

public record InboxInvitationDto(string Message, Guid? PostId, string? PostTitle);

/// <summary>
/// One inbox message. <see cref="Sender"/> is the inviting company; null means the super admin (vacancies).
/// </summary>
public record InboxItemDto(
    Guid Id,
    InboxItemKind Kind,
    bool IsRead,
    DateTime CreatedAt,
    AuthorDto? Sender,
    string Subject,
    string Preview,
    InboxInvitationDto? Invitation,
    VacancyDto? Vacancy);

public class InboxQuery : PageQuery
{
    public InboxItemKind? Kind { get; set; }
    public bool UnreadOnly { get; set; }
}

public interface IInboxService
{
    Task<PagedResult<InboxItemDto>> ListAsync(InboxQuery query, CancellationToken ct = default);
    Task<int> UnreadCountAsync(CancellationToken ct = default);
    Task MarkReadAsync(Guid id, CancellationToken ct = default);
    Task MarkAllReadAsync(CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

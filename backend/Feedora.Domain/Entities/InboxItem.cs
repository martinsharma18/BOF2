using Feedora.Domain.Enums;

namespace Feedora.Domain.Entities;

/// <summary>
/// One message in a user's mail-style inbox. The content lives on the invitation or vacancy it points to,
/// so a message sent to thousands of people is stored once.
/// </summary>
public class InboxItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public InboxItemKind Kind { get; set; }

    public Guid? InvitationId { get; set; }
    public Invitation? Invitation { get; set; }

    public Guid? VacancyId { get; set; }
    public Vacancy? Vacancy { get; set; }

    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

namespace BOF2.Domain.Entities;

public class ApplicationMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ApplicationId { get; set; }
    public PostApplication Application { get; set; } = null!;

    public Guid SenderId { get; set; }
    public AppUser Sender { get; set; } = null!;

    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

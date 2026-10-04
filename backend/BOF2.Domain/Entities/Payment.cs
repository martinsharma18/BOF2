namespace BOF2.Domain.Entities;

/// <summary>Money a company released to an individual for an accepted application. Credits the individual's wallet.</summary>
public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ApplicationId { get; set; }
    public PostApplication Application { get; set; } = null!;

    public Guid PayerId { get; set; }
    public AppUser Payer { get; set; } = null!;

    public Guid RecipientId { get; set; }
    public AppUser Recipient { get; set; } = null!;

    public decimal Amount { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

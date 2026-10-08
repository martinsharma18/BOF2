namespace BOF2.Domain.Entities;

public class Vacancy
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Organization { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>Where to apply: a web link or a phone number / email written as text.</summary>
    public string? HowToApply { get; set; }

    /// <summary>Hidden from the rail after this day.</summary>
    public DateOnly? Deadline { get; set; }
    public bool IsActive { get; set; } = true;

    /// <summary>When it was sent to every individual's inbox. Set the first time it goes live.</summary>
    public DateTime? AnnouncedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

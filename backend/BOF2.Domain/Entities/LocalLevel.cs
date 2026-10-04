namespace BOF2.Domain.Entities;

/// <summary>One of Nepal's 753 local levels (metropolitan city, sub-metropolitan city, municipality, rural municipality).</summary>
public class LocalLevel
{
    public int Id { get; set; }
    public string Province { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

using BOF2.Domain.Enums;
using Microsoft.AspNetCore.Identity;

namespace BOF2.Domain.Entities;

public class AppUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;
    public AccountType AccountType { get; set; }
    public string? Bio { get; set; }
    public string? AvatarUrl { get; set; }

    public bool IsDisabled { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public CompanyProfile? CompanyProfile { get; set; }
    public IndividualProfile? IndividualProfile { get; set; }
    public ICollection<Post> Posts { get; set; } = new List<Post>();
}

using Feedora.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Feedora.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<CompanyProfile> CompanyProfiles => Set<CompanyProfile>();
    public DbSet<IndividualProfile> IndividualProfiles => Set<IndividualProfile>();
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Reaction> Reactions => Set<Reaction>();
    public DbSet<Feedback> Feedbacks => Set<Feedback>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Ad> Ads => Set<Ad>();
    public DbSet<PostApplication> Applications => Set<PostApplication>();
    public DbSet<ApplicationMessage> ApplicationMessages => Set<ApplicationMessage>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<WithdrawalRequest> Withdrawals => Set<WithdrawalRequest>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AppUser>(e =>
        {
            e.Property(u => u.FullName).HasMaxLength(100).IsRequired();
            e.Property(u => u.AccountType).HasConversion<string>().HasMaxLength(20);
            e.Property(u => u.Bio).HasMaxLength(500);
            e.Property(u => u.AvatarUrl).HasMaxLength(500);
        });

        builder.Entity<CompanyProfile>(e =>
        {
            e.HasKey(p => p.UserId);
            e.HasOne(p => p.User).WithOne(u => u.CompanyProfile)
                .HasForeignKey<CompanyProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(p => p.CompanyName).HasMaxLength(150).IsRequired();
            e.Property(p => p.Province).HasMaxLength(50).IsRequired();
            e.Property(p => p.District).HasMaxLength(50).IsRequired();
        });

        builder.Entity<IndividualProfile>(e =>
        {
            e.HasKey(p => p.UserId);
            e.HasOne(p => p.User).WithOne(u => u.IndividualProfile)
                .HasForeignKey<IndividualProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(p => p.Gender).HasConversion<string>().HasMaxLength(10);
            e.Property(p => p.SocialMediaLink).HasMaxLength(300);
            e.Property(p => p.Province).HasMaxLength(50).IsRequired();
            e.Property(p => p.District).HasMaxLength(50).IsRequired();
            e.Property(p => p.AdditionalPhoneNumber).HasMaxLength(20);
        });

        builder.Entity<Post>(e =>
        {
            e.HasOne(p => p.Author).WithMany(u => u.Posts)
                .HasForeignKey(p => p.AuthorId).OnDelete(DeleteBehavior.Cascade);
            e.Property(p => p.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(p => p.Title).HasMaxLength(120).IsRequired();
            e.Property(p => p.GenderPreference).HasConversion<int>();
            e.Property(p => p.MediaUrl).HasMaxLength(500);
            e.Property(p => p.MaximumPayment).HasPrecision(12, 2);
            e.Property(p => p.Province).HasMaxLength(50);
            e.Property(p => p.District).HasMaxLength(50);
            e.Property(p => p.Requirement).HasMaxLength(4000).IsRequired();
            e.HasIndex(p => p.CreatedAt);
            e.HasIndex(p => new { p.AuthorId, p.CreatedAt });
            e.HasIndex(p => new { p.Province, p.District });
        });

        builder.Entity<Reaction>(e =>
        {
            e.HasOne(r => r.Post).WithMany(p => p.Reactions)
                .HasForeignKey(r => r.PostId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.User).WithMany()
                .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(r => r.Type).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(r => new { r.PostId, r.UserId }).IsUnique();
        });

        builder.Entity<Feedback>(e =>
        {
            e.HasOne(f => f.Post).WithMany(p => p.Feedbacks)
                .HasForeignKey(f => f.PostId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(f => f.User).WithMany()
                .HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(f => f.Content).HasMaxLength(2000).IsRequired();
            e.HasIndex(f => new { f.PostId, f.CreatedAt });
        });

        builder.Entity<Ad>(e =>
        {
            e.Property(a => a.Title).HasMaxLength(100).IsRequired();
            e.Property(a => a.Description).HasMaxLength(300);
            e.Property(a => a.ImageUrl).HasMaxLength(500).IsRequired();
            e.Property(a => a.LinkUrl).HasMaxLength(500);
            e.Property(a => a.Placement).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(a => new { a.Placement, a.IsActive });
        });

        builder.Entity<PostApplication>(e =>
        {
            e.HasOne(a => a.Post).WithMany(p => p.Applications)
                .HasForeignKey(a => a.PostId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.Applicant).WithMany()
                .HasForeignKey(a => a.ApplicantId).OnDelete(DeleteBehavior.Cascade);
            e.Property(a => a.Kind).HasConversion<string>().HasMaxLength(10);
            e.Property(a => a.Status).HasConversion<string>().HasMaxLength(10);
            e.Property(a => a.Message).HasMaxLength(1500).IsRequired();
            e.Property(a => a.ClaimedAmount).HasPrecision(12, 2);
            e.Property(a => a.ClaimNote).HasMaxLength(200);
            e.HasIndex(a => new { a.PostId, a.ApplicantId }).IsUnique();
            e.HasIndex(a => new { a.ApplicantId, a.CreatedAt });
        });

        builder.Entity<ApplicationMessage>(e =>
        {
            e.HasOne(m => m.Application).WithMany(a => a.Messages)
                .HasForeignKey(m => m.ApplicationId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.Sender).WithMany()
                .HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.Cascade);
            e.Property(m => m.Content).HasMaxLength(2000).IsRequired();
            e.HasIndex(m => new { m.ApplicationId, m.CreatedAt });
        });

        builder.Entity<Notification>(e =>
        {
            e.HasOne(n => n.User).WithMany()
                .HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(n => n.Type).HasConversion<string>().HasMaxLength(30);
            e.Property(n => n.Title).HasMaxLength(200).IsRequired();
            e.Property(n => n.Body).HasMaxLength(500);
            e.Property(n => n.Link).HasMaxLength(300);
            e.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });
        });

        builder.Entity<Payment>(e =>
        {
            // Restrict: money records must survive, so a paid application's post cannot be deleted.
            e.HasOne(p => p.Application).WithMany(a => a.Payments)
                .HasForeignKey(p => p.ApplicationId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.Payer).WithMany()
                .HasForeignKey(p => p.PayerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.Recipient).WithMany()
                .HasForeignKey(p => p.RecipientId).OnDelete(DeleteBehavior.Restrict);
            e.Property(p => p.Amount).HasPrecision(12, 2);
            e.Property(p => p.Note).HasMaxLength(200);
            e.HasIndex(p => new { p.RecipientId, p.CreatedAt });
        });

        builder.Entity<WithdrawalRequest>(e =>
        {
            e.HasOne(w => w.User).WithMany()
                .HasForeignKey(w => w.UserId).OnDelete(DeleteBehavior.Restrict);
            e.Property(w => w.Amount).HasPrecision(12, 2);
            e.Property(w => w.BankName).HasMaxLength(100).IsRequired();
            e.Property(w => w.AccountName).HasMaxLength(100).IsRequired();
            e.Property(w => w.AccountNumber).HasMaxLength(40).IsRequired();
            e.Property(w => w.Status).HasConversion<string>().HasMaxLength(10);
            e.Property(w => w.AdminNote).HasMaxLength(300);
            e.HasIndex(w => new { w.Status, w.CreatedAt });
            e.HasIndex(w => new { w.UserId, w.CreatedAt });
        });

        builder.Entity<RefreshToken>(e =>
        {
            e.HasOne(t => t.User).WithMany()
                .HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(t => t.TokenHash).HasMaxLength(64).IsRequired();
            e.HasIndex(t => t.TokenHash).IsUnique();
            e.Ignore(t => t.IsActive);
        });
    }
}

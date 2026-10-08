using BOF2.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BOF2.Infrastructure.Persistence;

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
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<Vacancy> Vacancies => Set<Vacancy>();
    public DbSet<VacancyApplication> VacancyApplications => Set<VacancyApplication>();
    public DbSet<InboxItem> InboxItems => Set<InboxItem>();
    public DbSet<LocalLevel> LocalLevels => Set<LocalLevel>();
    public DbSet<PushDevice> PushDevices => Set<PushDevice>();
    public DbSet<PasswordResetCode> PasswordResetCodes => Set<PasswordResetCode>();

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
            e.Property(p => p.District).HasMaxLength(50);
            e.Property(p => p.LocalLevel).HasMaxLength(100);
            e.Property(p => p.RegistrationDocumentUrl).HasMaxLength(500);
        });

        builder.Entity<IndividualProfile>(e =>
        {
            e.HasKey(p => p.UserId);
            e.HasOne(p => p.User).WithOne(u => u.IndividualProfile)
                .HasForeignKey<IndividualProfile>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(p => p.Gender).HasConversion<string>().HasMaxLength(10);
            e.Property(p => p.SocialMediaLink).HasMaxLength(300);
            e.Property(p => p.Province).HasMaxLength(50).IsRequired();
            e.Property(p => p.District).HasMaxLength(50);
            e.Property(p => p.LocalLevel).HasMaxLength(100);
            e.Property(p => p.AdditionalPhoneNumber).HasMaxLength(20);
        });

        builder.Entity<Post>(e =>
        {
            e.HasOne(p => p.Author).WithMany(u => u.Posts)
                .HasForeignKey(p => p.AuthorId).OnDelete(DeleteBehavior.Cascade);
            e.Property(p => p.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(p => p.Option).HasConversion<string>().HasMaxLength(10);
            e.Property(p => p.Title).HasMaxLength(120).IsRequired();
            e.Property(p => p.GenderPreference).HasConversion<int>();
            e.Property(p => p.MediaUrl).HasMaxLength(500);
            e.Property(p => p.MaximumPayment).HasPrecision(12, 2);
            e.Property(p => p.ContactNumber).HasMaxLength(20);
            e.Property(p => p.Province).HasMaxLength(50);
            e.Property(p => p.District).HasMaxLength(50);
            e.Property(p => p.LocalLevel).HasMaxLength(100);
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

        builder.Entity<PostApplication>(e =>
        {
            e.Property(a => a.ClaimDeclineReason).HasMaxLength(300);
            e.Property(a => a.ClaimAttachmentUrl).HasMaxLength(500);
            e.Property(a => a.ClaimAttachmentName).HasMaxLength(200);
        });

        builder.Entity<PasswordResetCode>(e =>
        {
            e.HasOne(c => c.User).WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(c => c.CodeHash).HasMaxLength(64).IsRequired();
            e.HasIndex(c => new { c.UserId, c.CreatedAt });
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

        builder.Entity<PushDevice>(e =>
        {
            e.HasOne(d => d.User).WithMany()
                .HasForeignKey(d => d.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(d => d.Endpoint).HasMaxLength(1000).IsRequired();
            e.Property(d => d.P256dh).HasMaxLength(200).IsRequired();
            e.Property(d => d.Auth).HasMaxLength(100).IsRequired();
            e.HasIndex(d => d.Endpoint).IsUnique();
            e.HasIndex(d => d.UserId);
        });

        builder.Entity<Notification>(e =>
        {
            e.HasOne(n => n.User).WithMany()
                .HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(n => n.Actor).WithMany()
                .HasForeignKey(n => n.ActorId).OnDelete(DeleteBehavior.SetNull);
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

        builder.Entity<Invitation>(e =>
        {
            e.HasOne(i => i.Company).WithMany()
                .HasForeignKey(i => i.CompanyId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.Post).WithMany()
                .HasForeignKey(i => i.PostId).OnDelete(DeleteBehavior.SetNull);
            e.Property(i => i.Title).HasMaxLength(120).IsRequired();
            e.Property(i => i.Message).HasMaxLength(500).IsRequired();
            e.Property(i => i.Province).HasMaxLength(50);
            e.Property(i => i.District).HasMaxLength(50);
            e.Property(i => i.LocalLevel).HasMaxLength(100);
            e.Property(i => i.Gender).HasConversion<string>().HasMaxLength(10);
            e.HasIndex(i => new { i.CompanyId, i.CreatedAt });
        });

        builder.Entity<Vacancy>(e =>
        {
            e.Property(v => v.Title).HasMaxLength(120).IsRequired();
            e.Property(v => v.Organization).HasMaxLength(150).IsRequired();
            e.Property(v => v.Location).HasMaxLength(150).IsRequired();
            e.Property(v => v.Description).HasMaxLength(2000).IsRequired();
            e.Property(v => v.HowToApply).HasMaxLength(300);
            e.HasIndex(v => new { v.IsActive, v.CreatedAt });
        });

        builder.Entity<VacancyApplication>(e =>
        {
            e.HasOne(a => a.Vacancy).WithMany()
                .HasForeignKey(a => a.VacancyId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.Applicant).WithMany()
                .HasForeignKey(a => a.ApplicantId).OnDelete(DeleteBehavior.Cascade);
            e.Property(a => a.CvUrl).HasMaxLength(500).IsRequired();
            e.Property(a => a.CvFileName).HasMaxLength(200).IsRequired();
            e.Property(a => a.Note).HasMaxLength(500);
            e.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(a => new { a.VacancyId, a.ApplicantId }).IsUnique();
            e.HasIndex(a => new { a.Status, a.CreatedAt });
        });

        builder.Entity<InboxItem>(e =>
        {
            e.HasOne(i => i.User).WithMany()
                .HasForeignKey(i => i.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.Invitation).WithMany()
                .HasForeignKey(i => i.InvitationId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(i => i.Vacancy).WithMany()
                .HasForeignKey(i => i.VacancyId).OnDelete(DeleteBehavior.Cascade);
            e.Property(i => i.Kind).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(i => new { i.UserId, i.IsRead, i.CreatedAt });
        });

        builder.Entity<LocalLevel>(e =>
        {
            e.Property(l => l.Province).HasMaxLength(50).IsRequired();
            e.Property(l => l.District).HasMaxLength(50).IsRequired();
            e.Property(l => l.Name).HasMaxLength(100).IsRequired();
            e.HasIndex(l => new { l.District, l.Name }).IsUnique();
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

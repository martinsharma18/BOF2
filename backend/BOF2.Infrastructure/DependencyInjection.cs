using BOF2.Application.Auth;
using BOF2.Application.Common;
using BOF2.Application.Admin;
using BOF2.Application.Ads;
using BOF2.Application.Applications;
using BOF2.Application.Inbox;
using BOF2.Application.Invitations;
using BOF2.Application.Locations;
using BOF2.Application.Notifications;
using BOF2.Application.Wallet;
using BOF2.Application.Feedbacks;
using BOF2.Application.Posts;
using BOF2.Application.Push;
using BOF2.Application.Reactions;
using BOF2.Application.Users;
using BOF2.Application.Vacancies;
using BOF2.Domain.Entities;
using BOF2.Infrastructure.Auth;
using BOF2.Infrastructure.Persistence;
using BOF2.Infrastructure.Push;
using BOF2.Infrastructure.Services;
using BOF2.Infrastructure.Email;
using BOF2.Infrastructure.Storage;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BOF2.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        string uploadsRootPath)
    {
        services.AddSingleton<PushQueue>();
        services.AddScoped<PushOnSaveInterceptor>();
        services.AddDbContext<AppDbContext>((sp, options) => options
            .UseNpgsql(ConnectionString.Normalize(configuration.GetConnectionString("Default")),
                npgsql => npgsql.EnableRetryOnFailure(3))
            .UseSnakeCaseNamingConvention()
            .AddInterceptors(sp.GetRequiredService<PushOnSaveInterceptor>()));

        services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database");

        services.AddIdentityCore<AppUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<FileStorageOptions>(o => o.RootPath = uploadsRootPath);

        services.AddScoped<TokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPostService, PostService>();
        services.AddScoped<IReactionService, ReactionService>();
        services.AddScoped<IFeedbackService, FeedbackService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IAdService, AdService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<IApplicationService, ApplicationService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IWalletService, WalletService>();
        services.AddScoped<IInvitationService, InvitationService>();
        services.AddScoped<IVacancyService, VacancyService>();
        services.AddScoped<IInboxService, InboxService>();
        services.AddScoped<ILocationService, LocationService>();

        // Phone notifications (Web Push): new notifications/inbox items are queued on save and sent in the background.
        services.Configure<PushOptions>(configuration.GetSection(PushOptions.SectionName));
        services.AddScoped<IPushService, PushService>();
        services.AddHttpClient("webpush", c => c.Timeout = TimeSpan.FromSeconds(15));
        services.AddHostedService<PushSender>();
        services.AddMemoryCache();

        // Email (password reset codes): Brevo when an API key is set, else SMTP when an account is configured, else the log.
        services.Configure<EmailOptions>(configuration.GetSection(EmailOptions.SectionName));
        if (!string.IsNullOrWhiteSpace(configuration[$"{EmailOptions.SectionName}:BrevoApiKey"]))
            services.AddHttpClient<IEmailSender, BrevoEmailSender>(c => c.Timeout = TimeSpan.FromSeconds(15));
        else if (!string.IsNullOrWhiteSpace(configuration[$"{EmailOptions.SectionName}:SmtpUser"]))
            services.AddScoped<IEmailSender, SmtpEmailSender>();
        else
            services.AddScoped<IEmailSender, LogEmailSender>();
        // Cloudinary when configured (hosted: Render's disk is wiped on deploy), local ./uploads otherwise.
        var cloudinaryUrl = configuration["Cloudinary:Url"];
        if (!string.IsNullOrWhiteSpace(cloudinaryUrl))
        {
            services.AddSingleton(new CloudinaryDotNet.Cloudinary(cloudinaryUrl) { Api = { Secure = true } });
            services.AddSingleton<IFileStorage, CloudinaryFileStorage>();
        }
        else
            services.AddSingleton<IFileStorage, LocalFileStorage>();

        return services;
    }
}

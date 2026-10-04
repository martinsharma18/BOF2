using Feedora.Application.Auth;
using Feedora.Application.Common;
using Feedora.Application.Admin;
using Feedora.Application.Ads;
using Feedora.Application.Applications;
using Feedora.Application.Inbox;
using Feedora.Application.Invitations;
using Feedora.Application.Locations;
using Feedora.Application.Notifications;
using Feedora.Application.Wallet;
using Feedora.Application.Feedbacks;
using Feedora.Application.Posts;
using Feedora.Application.Push;
using Feedora.Application.Reactions;
using Feedora.Application.Users;
using Feedora.Application.Vacancies;
using Feedora.Domain.Entities;
using Feedora.Infrastructure.Auth;
using Feedora.Infrastructure.Persistence;
using Feedora.Infrastructure.Push;
using Feedora.Infrastructure.Services;
using Feedora.Infrastructure.Storage;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Feedora.Infrastructure;

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
            .UseNpgsql(configuration.GetConnectionString("Default"),
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
        services.AddSingleton<IFileStorage, LocalFileStorage>();

        return services;
    }
}

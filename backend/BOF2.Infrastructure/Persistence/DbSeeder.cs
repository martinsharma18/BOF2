using BOF2.Domain;
using BOF2.Domain.Entities;
using BOF2.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BOF2.Infrastructure.Persistence;

public static class DbSeeder
{
    /// <summary>Loads Nepal's 753 local levels into the local_levels table (reloads if the list changed).</summary>
    private static async Task SeedLocalLevelsAsync(AppDbContext db, ILogger logger)
    {
        var expected = NepalLocalLevels.ByDistrict.Sum(d => d.Value.Length);
        if (await db.LocalLevels.CountAsync() == expected)
            return;

        var provinceOf = NepalLocations.Provinces
            .SelectMany(p => p.Value.Select(d => (District: d, Province: p.Key)))
            .ToDictionary(x => x.District, x => x.Province);

        await db.LocalLevels.ExecuteDeleteAsync();
        db.LocalLevels.AddRange(NepalLocalLevels.ByDistrict.SelectMany(d => d.Value.Select(name => new LocalLevel
        {
            Province = provinceOf[d.Key],
            District = d.Key,
            Name = name,
        })));
        await db.SaveChangesAsync();
        logger.LogInformation("Loaded {Count} local levels", expected);
    }

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;
        var logger = provider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DbSeeder));

        var db = provider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
        await SeedLocalLevelsAsync(db, logger);

        var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        foreach (var role in Roles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }

        var config = provider.GetRequiredService<IConfiguration>();
        var adminEmail = config["Seed:AdminEmail"];
        var adminPassword = config["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
            return;

        var userManager = provider.GetRequiredService<UserManager<AppUser>>();
        if (await userManager.FindByEmailAsync(adminEmail) is not null)
            return;

        var admin = new AppUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            EmailConfirmed = true,
            FullName = "Administrator",
            AccountType = AccountType.Admin,
        };
        var result = await userManager.CreateAsync(admin, adminPassword);
        if (!result.Succeeded)
        {
            logger.LogError("Could not seed admin: {Errors}", string.Join("; ", result.Errors.Select(e => e.Description)));
            return;
        }

        await userManager.AddToRoleAsync(admin, Roles.Admin);
        logger.LogInformation("Seeded admin account {Email}", adminEmail);
    }
}

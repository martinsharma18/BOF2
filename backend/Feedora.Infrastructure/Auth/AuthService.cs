using Feedora.Application.Auth;
using Feedora.Application.Common;
using Feedora.Application.Users;
using Feedora.Domain;
using Feedora.Domain.Entities;
using Feedora.Domain.Enums;
using Feedora.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Feedora.Infrastructure.Auth;

public class AuthService(
    AppDbContext db,
    UserManager<AppUser> userManager,
    TokenService tokens,
    IValidator<RegisterCompanyRequest> companyValidator,
    IValidator<RegisterIndividualRequest> individualValidator,
    IValidator<LoginRequest> loginValidator,
    IValidator<ChangePasswordRequest> changePasswordValidator) : IAuthService
{
    private const string InvalidCredentials = "Invalid email or password.";
    private const string DisabledMessage = "This account has been disabled. Please contact support.";

    public async Task<AuthResponse> RegisterCompanyAsync(RegisterCompanyRequest request, CancellationToken ct = default)
    {
        await companyValidator.ValidateAndThrowAsync(request, ct);

        var user = new AppUser
        {
            UserName = request.Email.Trim(),
            Email = request.Email.Trim(),
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            AccountType = AccountType.Company,
            CompanyProfile = new CompanyProfile
            {
                CompanyName = request.CompanyName.Trim(),
                Province = request.Province,
                District = NullIfBlank(request.District),
                LocalLevel = string.IsNullOrWhiteSpace(request.District) ? null : NullIfBlank(request.LocalLevel),
            },
        };

        return await CreateUserAsync(user, request.Password, Roles.Company, ct);
    }

    public async Task<AuthResponse> RegisterIndividualAsync(RegisterIndividualRequest request, CancellationToken ct = default)
    {
        await individualValidator.ValidateAndThrowAsync(request, ct);

        var user = new AppUser
        {
            UserName = request.Email.Trim(),
            Email = request.Email.Trim(),
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            AccountType = AccountType.Individual,
            IndividualProfile = new IndividualProfile
            {
                Gender = request.Gender,
                DateOfBirth = request.DateOfBirth,
                SocialMediaLink = NullIfBlank(request.SocialMediaLink),
                Province = request.Province,
                District = NullIfBlank(request.District),
                LocalLevel = string.IsNullOrWhiteSpace(request.District) ? null : NullIfBlank(request.LocalLevel),
                AdditionalPhoneNumber = NullIfBlank(request.AdditionalPhoneNumber),
            },
        };

        return await CreateUserAsync(user, request.Password, Roles.Individual, ct);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        await loginValidator.ValidateAndThrowAsync(request, ct);

        var user = await userManager.FindByEmailAsync(request.Email.Trim())
                   ?? throw new UnauthorizedException(InvalidCredentials);

        if (user.IsDisabled)
            throw new UnauthorizedException(DisabledMessage);

        if (await userManager.IsLockedOutAsync(user))
            throw new UnauthorizedException("Too many failed attempts. Try again in a few minutes.");

        if (!await userManager.CheckPasswordAsync(user, request.Password))
        {
            await userManager.AccessFailedAsync(user);
            throw new UnauthorizedException(InvalidCredentials);
        }

        await userManager.ResetAccessFailedCountAsync(user);
        return await IssueTokensAsync(user, ct);
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var hash = TokenService.Hash(request.RefreshToken ?? string.Empty);
        var stored = await db.RefreshTokens.Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is null || !stored.IsActive || stored.User.IsDisabled)
            throw new UnauthorizedException("Session expired. Please log in again.");

        // Rotate: each refresh token can be used once.
        stored.RevokedAt = DateTime.UtcNow;
        return await IssueTokensAsync(stored.User, ct);
    }

    public async Task LogoutAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var hash = TokenService.Hash(request.RefreshToken ?? string.Empty);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (stored is { RevokedAt: null })
        {
            stored.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task<UserDto> GetMeAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.AsNoTracking().Include(u => u.CompanyProfile)
                       .FirstOrDefaultAsync(u => u.Id == userId, ct)
                   ?? throw new NotFoundException("User not found.");
        return ToDto(user);
    }

    public async Task<AuthResponse> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        await changePasswordValidator.ValidateAndThrowAsync(request, ct);
        var user = await userManager.FindByIdAsync(userId.ToString())
                   ?? throw new NotFoundException("User not found.");

        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var wrongCurrent = result.Errors.Any(e => e.Code == nameof(IdentityErrorDescriber.PasswordMismatch));
            throw new FieldErrorsException(wrongCurrent
                ? new Dictionary<string, string[]> { ["CurrentPassword"] = ["Current password is incorrect."] }
                : new Dictionary<string, string[]> { ["NewPassword"] = result.Errors.Select(e => e.Description).ToArray() });
        }

        // Sign out every other device.
        var now = DateTime.UtcNow;
        await db.RefreshTokens.Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);

        return await IssueTokensAsync(user, ct);
    }

    private async Task<AuthResponse> CreateUserAsync(AppUser user, string password, string role, CancellationToken ct)
    {
        if (await userManager.FindByEmailAsync(user.Email!) is not null)
            throw new FieldErrorsException(new Dictionary<string, string[]>
            {
                ["Email"] = ["An account with this email already exists."],
            });

        // Retrying DB connections requires manual transactions to run inside the execution strategy.
        var strategy = db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);

            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded)
                throw new FieldErrorsException(new Dictionary<string, string[]>
                {
                    ["Password"] = result.Errors.Select(e => e.Description).ToArray(),
                });

            await userManager.AddToRoleAsync(user, role);
            var response = await IssueTokensAsync(user, ct);

            await tx.CommitAsync(ct);
            return response;
        });
    }

    private async Task<AuthResponse> IssueTokensAsync(AppUser user, CancellationToken ct)
    {
        var roles = await userManager.GetRolesAsync(user);
        var (accessToken, expiresAt) = tokens.CreateAccessToken(user, roles);
        var (refreshToken, entity) = tokens.CreateRefreshToken(user.Id);

        db.RefreshTokens.Add(entity);
        await db.SaveChangesAsync(ct);

        if (user.AccountType == AccountType.Company && user.CompanyProfile is null)
            await db.Entry(user).Reference(u => u.CompanyProfile).LoadAsync(ct);

        return new AuthResponse(accessToken, expiresAt, refreshToken, ToDto(user));
    }

    private static UserDto ToDto(AppUser user) =>
        new(user.Id, user.Email ?? string.Empty, user.FullName, user.AccountType,
            user.CompanyProfile?.CompanyName, user.AvatarUrl);

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

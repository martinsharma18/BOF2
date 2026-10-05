using BOF2.Application.Auth;
using BOF2.Application.Common;
using BOF2.Application.Users;
using BOF2.Domain;
using BOF2.Domain.Entities;
using BOF2.Domain.Enums;
using BOF2.Infrastructure.Persistence;
using System.Security.Cryptography;
using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace BOF2.Infrastructure.Auth;

public class AuthService(
    AppDbContext db,
    UserManager<AppUser> userManager,
    TokenService tokens,
    IValidator<RegisterCompanyRequest> companyValidator,
    IValidator<RegisterIndividualRequest> individualValidator,
    IValidator<LoginRequest> loginValidator,
    IValidator<ChangePasswordRequest> changePasswordValidator,
    IValidator<ForgotPasswordRequest> forgotPasswordValidator,
    IValidator<ResetPasswordRequest> resetPasswordValidator,
    IEmailSender email,
    IHostEnvironment environment) : IAuthService
{
    private const int ResetCodeMinutes = 10;
    private const int ResetCodeResendSeconds = 60;
    private const int ResetCodeMaxAttempts = 5;
    private const int ResetCodesPerHour = 5;

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

    public async Task<ForgotPasswordResponse> SendResetCodeAsync(ForgotPasswordRequest request, CancellationToken ct = default)
    {
        await forgotPasswordValidator.ValidateAndThrowAsync(request, ct);
        var user = await FindForResetAsync(request.Email, ct);

        var now = DateTime.UtcNow;
        var recent = await db.PasswordResetCodes.AsNoTracking()
            .Where(c => c.UserId == user.Id && c.CreatedAt > now.AddHours(-1))
            .Select(c => c.CreatedAt)
            .ToListAsync(ct);
        if (recent.Count >= ResetCodesPerHour)
            throw EmailError("Too many codes requested. Try again in an hour.");
        var wait = recent.Count == 0 ? 0 : ResetCodeResendSeconds - (int)(now - recent.Max()).TotalSeconds;
        if (wait > 0)
            throw EmailError($"A code was just sent. Wait {wait} seconds to get a new one.");

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var resetCode = new PasswordResetCode
        {
            UserId = user.Id,
            CodeHash = HashResetCode(user.Id, code),
            ExpiresAt = now.AddMinutes(ResetCodeMinutes),
        };
        db.PasswordResetCodes.Add(resetCode);
        await db.SaveChangesAsync(ct);

        try
        {
            await email.SendAsync(user.Email!, user.FullName, $"Your BOF2 password reset code: {code}",
                $"Hello {user.FullName},\n\n" +
                $"Your BOF2 password reset code is: {code}\n\n" +
                $"It works for {ResetCodeMinutes} minutes. Do not share it with anyone.\n" +
                "If you did not ask to reset your password, you can ignore this email.", ct);
        }
        catch
        {
            // The email never went out: drop the code so it doesn't count against the resend wait or hourly limit.
            db.PasswordResetCodes.Remove(resetCode);
            await db.SaveChangesAsync(CancellationToken.None);
            throw;
        }

        // Without an email provider the code only reaches the server log; show it on screen while developing.
        var devCode = !email.IsLive && environment.IsDevelopment() ? code : null;
        return new ForgotPasswordResponse(MaskEmail(user.Email!), ResetCodeMinutes, ResetCodeResendSeconds, devCode);
    }

    public async Task<AuthResponse> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        await resetPasswordValidator.ValidateAndThrowAsync(request, ct);
        var user = await FindForResetAsync(request.Email, ct);

        var now = DateTime.UtcNow;
        var stored = await db.PasswordResetCodes
            .Where(c => c.UserId == user.Id && c.UsedAt == null)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(ct);
        if (stored is null || stored.ExpiresAt <= now || stored.Attempts >= ResetCodeMaxAttempts)
            throw CodeError("This code has expired. Request a new one.");

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(stored.CodeHash),
                Encoding.UTF8.GetBytes(HashResetCode(user.Id, request.Code.Trim()))))
        {
            stored.Attempts++;
            await db.SaveChangesAsync(ct);
            var left = ResetCodeMaxAttempts - stored.Attempts;
            throw CodeError(left > 0 ? $"Wrong code. {left} {(left == 1 ? "try" : "tries")} left." : "Wrong code. Request a new one.");
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var result = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
        if (!result.Succeeded)
            throw new FieldErrorsException(new Dictionary<string, string[]>
            {
                ["NewPassword"] = result.Errors.Select(e => e.Description).ToArray(),
            });

        stored.UsedAt = now;
        await userManager.SetLockoutEndDateAsync(user, null);
        await userManager.ResetAccessFailedCountAsync(user);

        // Sign out every device: whoever knew the old password is out now.
        await db.RefreshTokens.Where(t => t.UserId == user.Id && t.RevokedAt == null)
            .ExecuteUpdateAsync(u => u.SetProperty(t => t.RevokedAt, now), ct);

        return await IssueTokensAsync(user, ct);
    }

    private async Task<AppUser> FindForResetAsync(string address, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(address.Trim())
                   ?? throw EmailError("No account uses this email. Check it, or contact support.");
        if (user.IsDisabled)
            throw EmailError(DisabledMessage);
        return user;
    }

    private static string HashResetCode(Guid userId, string code) => TokenService.Hash($"{userId:N}:{code}");

    /// <summary>"martin@gmail.com" → "ma••••@gmail.com", so the page can say where the code went.</summary>
    private static string MaskEmail(string address)
    {
        var at = address.IndexOf('@');
        if (at <= 0) return address;
        var shown = Math.Min(2, at);
        return address[..shown] + new string('•', Math.Max(at - shown, 2)) + address[at..];
    }

    private static FieldErrorsException EmailError(string message) =>
        new(new Dictionary<string, string[]> { ["Email"] = [message] });

    private static FieldErrorsException CodeError(string message) =>
        new(new Dictionary<string, string[]> { ["Code"] = [message] });

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

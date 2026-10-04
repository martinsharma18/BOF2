using BOF2.Application.Auth;
using BOF2.Application.Common;
using BOF2.Application.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace BOF2.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController(IAuthService auth, ICurrentUser currentUser) : ControllerBase
{
    /// <summary>User A — company registration.</summary>
    [HttpPost("register/company")]
    public Task<AuthResponse> RegisterCompany(RegisterCompanyRequest request, CancellationToken ct) =>
        auth.RegisterCompanyAsync(request, ct);

    /// <summary>User B — individual registration.</summary>
    [HttpPost("register/individual")]
    public Task<AuthResponse> RegisterIndividual(RegisterIndividualRequest request, CancellationToken ct) =>
        auth.RegisterIndividualAsync(request, ct);

    [HttpPost("login")]
    public Task<AuthResponse> Login(LoginRequest request, CancellationToken ct) =>
        auth.LoginAsync(request, ct);

    [HttpPost("refresh")]
    public Task<AuthResponse> Refresh(RefreshRequest request, CancellationToken ct) =>
        auth.RefreshAsync(request, ct);

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken ct)
    {
        await auth.LogoutAsync(request, ct);
        return NoContent();
    }

    /// <summary>Forgot password: emails a 6-digit code to the account's address.</summary>
    [HttpPost("forgot-password")]
    public Task<ForgotPasswordResponse> ForgotPassword(ForgotPasswordRequest request, CancellationToken ct) =>
        auth.SendResetCodeAsync(request, ct);

    /// <summary>Forgot password: the emailed code + a new password. Signs the user in.</summary>
    [HttpPost("reset-password")]
    public Task<AuthResponse> ResetPassword(ResetPasswordRequest request, CancellationToken ct) =>
        auth.ResetPasswordAsync(request, ct);

    [Authorize]
    [HttpPost("change-password")]
    public Task<AuthResponse> ChangePassword(ChangePasswordRequest request, CancellationToken ct) =>
        auth.ChangePasswordAsync(currentUser.RequireUserId(), request, ct);

    [Authorize]
    [DisableRateLimiting]
    [HttpGet("me")]
    public Task<UserDto> Me(CancellationToken ct) => auth.GetMeAsync(currentUser.RequireUserId(), ct);
}

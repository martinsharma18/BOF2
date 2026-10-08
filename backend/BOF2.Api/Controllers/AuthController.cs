using BOF2.Api.Infrastructure;
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
    /// <remarks>multipart/form-data: the form fields plus <c>registrationDocument</c> (JPG/PNG photo).</remarks>
    [HttpPost("register/company")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public Task<AuthResponse> RegisterCompany([FromForm] RegisterCompanyRequest request, IFormFile? registrationDocument, CancellationToken ct) =>
        registrationDocument.WithUploadAsync(upload => auth.RegisterCompanyAsync(request, upload, ct));

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

    [HttpPost("forgot-password")]
    public Task<ForgotPasswordResponse> ForgotPassword(ForgotPasswordRequest request, CancellationToken ct) =>
        auth.SendResetCodeAsync(request, ct);

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

using BOF2.Application.Common;
using BOF2.Application.Users;

namespace BOF2.Application.Auth;

public interface IAuthService
{
    /// <param name="registrationDocument">Photo of the company registration certificate or PAN document (required).</param>
    Task<AuthResponse> RegisterCompanyAsync(RegisterCompanyRequest request, FileUpload? registrationDocument, CancellationToken ct = default);
    Task<AuthResponse> RegisterIndividualAsync(RegisterIndividualRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default);
    Task LogoutAsync(RefreshRequest request, CancellationToken ct = default);
    Task<UserDto> GetMeAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Changes the password, signs out every other session and returns fresh tokens.</summary>
    Task<AuthResponse> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default);

    Task<ForgotPasswordResponse> SendResetCodeAsync(ForgotPasswordRequest request, CancellationToken ct = default);

    /// <summary>Checks the emailed code, sets the new password, signs out every other session and returns fresh tokens.</summary>
    Task<AuthResponse> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);
}

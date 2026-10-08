using BOF2.Domain.Enums;

namespace BOF2.Application.Auth;

public record RegisterCompanyRequest(
    string FullName,
    string CompanyName,
    string Email,
    string PhoneNumber,
    string Province,
    string? District,
    string? LocalLevel,
    string Password,
    string ConfirmPassword);

public record RegisterIndividualRequest(
    string FullName,
    Gender Gender,
    DateOnly? DateOfBirth,
    string Email,
    string PhoneNumber,
    string? SocialMediaLink,
    string Province,
    string? District,
    string? LocalLevel,
    string? AdditionalPhoneNumber,
    string Password,
    string ConfirmPassword);

public record LoginRequest(string Email, string Password);

public record RefreshRequest(string RefreshToken);

public record ForgotPasswordRequest(string Email);

/// <summary>Where the code went (masked) and when another can be requested. <see cref="DevCode"/> is only filled in development without an email provider.</summary>
public record ForgotPasswordResponse(string SentTo, int ExpiresInMinutes, int ResendAfterSeconds, string? DevCode);

public record ResetPasswordRequest(string Email, string Code, string NewPassword, string ConfirmPassword);

public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    AccountType AccountType,
    string? CompanyName,
    string? AvatarUrl);

public record AuthResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken,
    UserDto User);

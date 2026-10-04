using BOF2.Domain.Enums;

namespace BOF2.Application.Auth;

/// <summary>User A (company) registration form.</summary>
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

/// <summary>User B (individual) registration form.</summary>
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

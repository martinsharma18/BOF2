using BOF2.Application.Common;
using BOF2.Domain.Enums;
using FluentValidation;

namespace BOF2.Application.Users;

/// <summary>What anyone logged in can see about a user. Contact details are not included.</summary>
public record PublicProfileDto(
    Guid Id,
    string FullName,
    AccountType AccountType,
    string? CompanyName,
    string? AvatarUrl,
    string? Bio,
    string? Province,
    string? District,
    string? LocalLevel,
    string? SocialMediaLink,
    Gender? Gender,
    int? Age,
    DateTime JoinedAt,
    int PostCount);

/// <summary>The signed-in user's own profile, including private contact details.</summary>
public record MyProfileDto(
    PublicProfileDto Profile,
    string Email,
    string? PhoneNumber,
    string? AdditionalPhoneNumber,
    DateOnly? DateOfBirth);

public record UpdateProfileRequest(
    string FullName,
    string? CompanyName,
    Gender? Gender,
    DateOnly? DateOfBirth,
    string PhoneNumber,
    string? AdditionalPhoneNumber,
    string? SocialMediaLink,
    string? Province,
    string? District,
    string? LocalLevel,
    string? Bio);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword, string ConfirmPassword);

public class UpdateProfileValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.CompanyName).MaximumLength(150);
        RuleFor(x => x.Gender).IsInEnum().When(x => x.Gender.HasValue);
        RuleFor(x => x.PhoneNumber).NotEmpty().PhoneNumber();
        RuleFor(x => x.AdditionalPhoneNumber).PhoneNumber()
            .When(x => !string.IsNullOrWhiteSpace(x.AdditionalPhoneNumber));
        RuleFor(x => x.SocialMediaLink).MaximumLength(300).HttpUrl()
            .When(x => !string.IsNullOrWhiteSpace(x.SocialMediaLink));
        RuleFor(x => x.Bio).MaximumLength(500);
        When(x => x.Province is not null || x.District is not null,
            () => this.ValidArea(x => x.Province, x => x.District, x => x.LocalLevel));
        RuleFor(x => x.DateOfBirth).ValidDateOfBirth().When(x => x.DateOfBirth.HasValue);
    }
}

public class ChangePasswordValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8)
            .NotEqual(x => x.CurrentPassword).WithMessage("The new password must be different.");
        RuleFor(x => x.ConfirmPassword).Equal(x => x.NewPassword).WithMessage("Passwords do not match.");
    }
}

public interface IUserService
{
    Task<PublicProfileDto> GetPublicAsync(Guid userId, CancellationToken ct = default);
    Task<MyProfileDto> GetMineAsync(CancellationToken ct = default);
    Task<MyProfileDto> UpdateMineAsync(UpdateProfileRequest request, CancellationToken ct = default);
    Task<MyProfileDto> SetAvatarAsync(FileUpload? image, CancellationToken ct = default);
}

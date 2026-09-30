using Feedora.Application.Common;
using Feedora.Domain.Enums;
using FluentValidation;

namespace Feedora.Application.Users;

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
    string? SocialMediaLink,
    Gender? Gender,
    DateTime JoinedAt,
    int PostCount);

/// <summary>The signed-in user's own profile, including private contact details.</summary>
public record MyProfileDto(
    PublicProfileDto Profile,
    string Email,
    string? PhoneNumber,
    string? AdditionalPhoneNumber);

public record UpdateProfileRequest(
    string FullName,
    string? CompanyName,
    Gender? Gender,
    string PhoneNumber,
    string? AdditionalPhoneNumber,
    string? SocialMediaLink,
    string? Province,
    string? District,
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
            () => this.ValidLocation(x => x.Province, x => x.District));
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

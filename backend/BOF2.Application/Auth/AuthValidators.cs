using BOF2.Application.Common;
using FluentValidation;

namespace BOF2.Application.Auth;

public class RegisterCompanyValidator : AbstractValidator<RegisterCompanyRequest>
{
    public RegisterCompanyValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.CompanyName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.PhoneNumber).NotEmpty().PhoneNumber();
        this.ValidArea(x => x.Province, x => x.District, x => x.LocalLevel);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.ConfirmPassword).Equal(x => x.Password).WithMessage("Passwords do not match.");
    }
}

public class RegisterIndividualValidator : AbstractValidator<RegisterIndividualRequest>
{
    public RegisterIndividualValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Gender).IsInEnum();
        RuleFor(x => x.DateOfBirth).ValidDateOfBirth();
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.PhoneNumber).NotEmpty().PhoneNumber();
        RuleFor(x => x.AdditionalPhoneNumber).PhoneNumber()
            .When(x => !string.IsNullOrWhiteSpace(x.AdditionalPhoneNumber));
        RuleFor(x => x.SocialMediaLink).MaximumLength(300).HttpUrl()
            .When(x => !string.IsNullOrWhiteSpace(x.SocialMediaLink));
        this.ValidArea(x => x.Province, x => x.District, x => x.LocalLevel);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.ConfirmPassword).Equal(x => x.Password).WithMessage("Passwords do not match.");
    }
}

public class LoginValidator : AbstractValidator<LoginRequest>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

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
        RuleFor(x => x.SocialMediaLink).Cascade(CascadeMode.Stop).NotEmpty().WithMessage("Enter your social media link.")
            .MaximumLength(300).HttpUrl();
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

public class ForgotPasswordValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("Enter your email.").EmailAddress();
    }
}

public class ResetPasswordValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Code).NotEmpty().WithMessage("Enter the 6-digit code.")
            .Matches(@"^\s*[0-9]{6}\s*$").WithMessage("The code has 6 digits.");
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8);
        RuleFor(x => x.ConfirmPassword).Equal(x => x.NewPassword).WithMessage("Passwords do not match.");
    }
}

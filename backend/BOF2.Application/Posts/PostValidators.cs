using BOF2.Application.Common;
using FluentValidation;

namespace BOF2.Application.Posts;

public class PostFormValidator : AbstractValidator<PostFormRequest>
{
    public PostFormValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(120);
        RuleFor(x => x.AcceptsMale).Must((x, male) => male || x.AcceptsFemale)
            .WithMessage("Choose Male, Female or Both.");
        RuleFor(x => x.MinimumNumber).InclusiveBetween(1, 10_000);
        RuleFor(x => x.ContactNumber).NotEmpty().WithMessage("Enter a contact number.")
            .Matches(@"^\+?[0-9][0-9\s-]{5,18}$").WithMessage("Enter a valid phone number.");
        RuleFor(x => x.WitnessContactNumber).NotEmpty().WithMessage("Enter a witness contact number.")
            .Matches(@"^\+?[0-9][0-9\s-]{5,18}$").WithMessage("Enter a valid phone number.");
        RuleFor(x => x.MaximumPayment).GreaterThanOrEqualTo(0).LessThan(1_000_000_000);
        RuleFor(x => x.Requirement).NotEmpty().MaximumLength(4000);
        When(x => !x.IsFromAnywhere, () => this.ValidArea(x => x.Province, x => x.District, x => x.LocalLevel));
    }
}

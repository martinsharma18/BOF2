using BOF2.Application.Common;
using BOF2.Domain.Enums;
using FluentValidation;

namespace BOF2.Application.Posts;

public class PostFormValidator : AbstractValidator<PostFormRequest>
{
    public PostFormValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
        When(x => x.Type == PostType.Type1, () =>
            RuleFor(x => x.Option).NotNull().WithMessage("Choose option A or B.").IsInEnum());
        RuleFor(x => x.Title).NotEmpty().MaximumLength(120);
        // Type 2 posts have no gender or number of people.
        When(x => x.Type != PostType.Type2, () =>
        {
            RuleFor(x => x.AcceptsMale).Must((x, male) => male || x.AcceptsFemale)
                .WithMessage("Choose Male, Female or Both.");
            RuleFor(x => x.MinimumNumber).InclusiveBetween(1, 10_000);
        });
        RuleFor(x => x.ContactNumber).NotEmpty().WithMessage("Enter a contact number.")
            .Matches(@"^\+?[0-9][0-9\s-]{5,18}$").WithMessage("Enter a valid phone number.");
        // Any number, not necessarily a phone number: digits only.
        RuleFor(x => x.WitnessContactNumber).NotEmpty().WithMessage("Enter a witness contact number.")
            .Matches(@"^\s*[0-9]{1,20}\s*$").WithMessage("Enter numbers only (up to 20 digits).");
        RuleFor(x => x.MaximumPayment).GreaterThanOrEqualTo(0).LessThan(1_000_000_000);
        RuleFor(x => x.Requirement).NotEmpty().MaximumLength(4000);
        When(x => !x.IsFromAnywhere, () => this.ValidArea(x => x.Province, x => x.District, x => x.LocalLevel));
    }
}

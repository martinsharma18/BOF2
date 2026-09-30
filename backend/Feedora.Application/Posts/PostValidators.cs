using Feedora.Application.Common;
using FluentValidation;

namespace Feedora.Application.Posts;

public class PostFormValidator : AbstractValidator<PostFormRequest>
{
    public PostFormValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(120);
        RuleFor(x => x.AcceptsMale).Must((x, male) => male || x.AcceptsFemale)
            .WithMessage("Select at least one of M or F.");
        RuleFor(x => x.MinimumNumber).InclusiveBetween(1, 10_000);
        RuleFor(x => x.MaximumPayment).GreaterThanOrEqualTo(0).LessThan(1_000_000_000);
        RuleFor(x => x.Requirement).NotEmpty().MaximumLength(4000);
        When(x => !x.IsFromAnywhere, () => this.ValidLocation(x => x.Province, x => x.District));
    }
}

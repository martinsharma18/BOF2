using Feedora.Domain;
using FluentValidation;

namespace Feedora.Application.Common;

public static class ValidationRules
{
    private const string PhonePattern = @"^\+?[0-9\s-]{7,15}$";

    public static IRuleBuilderOptions<T, string?> PhoneNumber<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Matches(PhonePattern).WithMessage("Enter a valid phone number.");

    public static IRuleBuilderOptions<T, string?> HttpUrl<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Must(link => Uri.TryCreate(link, UriKind.Absolute, out var uri) &&
                          (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
            .WithMessage("Enter a full link starting with http:// or https://.");

    /// <summary>Province must exist and District must belong to it (Nepal's 7 provinces / 77 districts).</summary>
    public static void ValidLocation<T>(
        this AbstractValidator<T> validator,
        System.Linq.Expressions.Expression<Func<T, string?>> province,
        System.Linq.Expressions.Expression<Func<T, string?>> district)
    {
        var getProvince = province.Compile();

        validator.RuleFor(province).NotEmpty()
            .Must(p => p is null || NepalLocations.Provinces.ContainsKey(p))
            .WithMessage("Unknown province.");

        validator.RuleFor(district).NotEmpty()
            .Must((x, d) => NepalLocations.IsValid(getProvince(x), d))
            .When(x => getProvince(x) is { } p && NepalLocations.Provinces.ContainsKey(p))
            .WithMessage("District does not belong to the selected province.");
    }
}

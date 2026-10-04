using BOF2.Domain;
using FluentValidation;

namespace BOF2.Application.Common;

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

    /// <summary>Province / District as above, plus a Local level that must belong to the district.</summary>
    public static void ValidLocation<T>(
        this AbstractValidator<T> validator,
        System.Linq.Expressions.Expression<Func<T, string?>> province,
        System.Linq.Expressions.Expression<Func<T, string?>> district,
        System.Linq.Expressions.Expression<Func<T, string?>> localLevel,
        bool localLevelRequired)
    {
        validator.ValidLocation(province, district);
        validator.ValidLocalLevel(district, localLevel, localLevelRequired);
    }

    public static void ValidLocalLevel<T>(
        this AbstractValidator<T> validator,
        System.Linq.Expressions.Expression<Func<T, string?>> district,
        System.Linq.Expressions.Expression<Func<T, string?>> localLevel,
        bool required)
    {
        var getDistrict = district.Compile();
        var getLocalLevel = localLevel.Compile();

        if (required)
            validator.RuleFor(localLevel).NotEmpty().WithMessage("Select your local level.");

        validator.RuleFor(localLevel)
            .Must((x, l) => NepalLocalLevels.IsValid(getDistrict(x), l))
            .When(x => !string.IsNullOrEmpty(getLocalLevel(x)))
            .WithMessage("Local level does not belong to the selected district.");
    }

    /// <summary>
    /// An area that can be a whole province, a whole district, or one local level.
    /// Province is required; District and Local level are optional but must belong to the level above.
    /// </summary>
    public static void ValidArea<T>(
        this AbstractValidator<T> validator,
        System.Linq.Expressions.Expression<Func<T, string?>> province,
        System.Linq.Expressions.Expression<Func<T, string?>> district,
        System.Linq.Expressions.Expression<Func<T, string?>> localLevel)
    {
        var getProvince = province.Compile();
        var getDistrict = district.Compile();
        var getLocalLevel = localLevel.Compile();

        validator.RuleFor(province).NotEmpty().WithMessage("Select a province.")
            .Must(p => p is null || NepalLocations.Provinces.ContainsKey(p))
            .WithMessage("Unknown province.");

        validator.RuleFor(district)
            .Must((x, d) => NepalLocations.IsValid(getProvince(x), d))
            .When(x => !string.IsNullOrEmpty(getDistrict(x)))
            .WithMessage("District does not belong to the selected province.");

        validator.RuleFor(localLevel)
            .Must((x, l) => NepalLocalLevels.IsValid(getDistrict(x), l))
            .When(x => !string.IsNullOrEmpty(getLocalLevel(x)))
            .WithMessage("Choose a district first, then a local level inside it.");
    }

    /// <summary>Date of birth for an individual: a real date that makes them 16-100 years old.</summary>
    public static IRuleBuilderOptions<T, DateOnly?> ValidDateOfBirth<T>(this IRuleBuilder<T, DateOnly?> rule) =>
        rule.NotNull().WithMessage("Enter your date of birth.")
            .Must(d => d is null || Age.From(d.Value) is >= 16 and <= 100)
            .WithMessage("You must be between 16 and 100 years old.");
}

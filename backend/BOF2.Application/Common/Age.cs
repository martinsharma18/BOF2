namespace BOF2.Application.Common;

public static class Age
{
    public static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);

    /// <summary>Whole years between <paramref name="dateOfBirth"/> and today.</summary>
    public static int From(DateOnly dateOfBirth)
    {
        var today = Today;
        var age = today.Year - dateOfBirth.Year;
        return dateOfBirth > today.AddYears(-age) ? age - 1 : age;
    }

    public static int? From(DateOnly? dateOfBirth) => dateOfBirth is { } d ? From(d) : null;
}

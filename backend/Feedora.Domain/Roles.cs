namespace Feedora.Domain;

public static class Roles
{
    public const string Company = "Company";
    public const string Individual = "Individual";
    public const string Admin = "Admin";

    public static readonly string[] All = [Company, Individual, Admin];
}

namespace BOF2.Domain;

public static class PaymentRules
{
    /// <summary>
    /// Who settles payment claims. False (now): admins pay or decline claims from the admin dashboard.
    /// True: the company that posted the job pays its own applicants. Flip to true to bring that back.
    /// </summary>
    public static readonly bool CompanyPaysClaims = false;
}

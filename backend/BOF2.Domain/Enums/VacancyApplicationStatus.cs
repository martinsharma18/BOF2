namespace BOF2.Domain.Enums;

/// <summary>Where a vacancy application stands: waiting for an admin, accepted or rejected.</summary>
public enum VacancyApplicationStatus
{
    Pending = 1,
    Accepted = 2,
    Rejected = 3
}

namespace BOF2.Application.Common;

public interface ICurrentUser
{
    Guid? UserId { get; }
    bool IsAdmin { get; }

    Guid RequireUserId();
}

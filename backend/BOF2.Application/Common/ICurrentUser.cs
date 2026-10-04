namespace BOF2.Application.Common;

public interface ICurrentUser
{
    Guid? UserId { get; }
    bool IsAdmin { get; }

    /// <summary>Returns the user id or throws <see cref="UnauthorizedException"/>.</summary>
    Guid RequireUserId();
}

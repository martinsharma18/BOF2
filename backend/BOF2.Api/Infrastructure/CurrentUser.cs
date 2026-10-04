using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using BOF2.Application.Common;
using BOF2.Domain;

namespace BOF2.Api.Infrastructure;

public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public Guid? UserId =>
        Guid.TryParse(Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id) ? id : null;

    public bool IsAdmin => Principal?.IsInRole(Roles.Admin) ?? false;

    public Guid RequireUserId() => UserId ?? throw new UnauthorizedException("You must be logged in.");
}

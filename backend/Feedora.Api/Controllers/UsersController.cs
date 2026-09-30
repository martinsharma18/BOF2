using Feedora.Api.Infrastructure;
using Feedora.Application.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Feedora.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(IUserService users) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public Task<PublicProfileDto> GetProfile(Guid id, CancellationToken ct) => users.GetPublicAsync(id, ct);

    [HttpGet("me")]
    public Task<MyProfileDto> GetMine(CancellationToken ct) => users.GetMineAsync(ct);

    [HttpPut("me")]
    public Task<MyProfileDto> UpdateMine(UpdateProfileRequest request, CancellationToken ct) =>
        users.UpdateMineAsync(request, ct);

    [HttpPut("me/avatar")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public Task<MyProfileDto> SetAvatar(IFormFile avatar, CancellationToken ct) =>
        avatar.WithUploadAsync(upload => users.SetAvatarAsync(upload, ct));

    [HttpDelete("me/avatar")]
    public Task<MyProfileDto> RemoveAvatar(CancellationToken ct) => users.SetAvatarAsync(null, ct);
}

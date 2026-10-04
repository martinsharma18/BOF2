using BOF2.Application.Common;
using BOF2.Application.Users;
using BOF2.Domain.Entities;
using BOF2.Domain.Enums;
using BOF2.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace BOF2.Infrastructure.Services;

public class UserService(
    AppDbContext db,
    ICurrentUser currentUser,
    IFileStorage fileStorage,
    IValidator<UpdateProfileRequest> validator,
    IValidator<UpdatePhoneRequest> phoneValidator) : IUserService
{
    private const string LockedMessage = "Your profile details are locked. You can only change your phone number.";

    public async Task<PublicProfileDto> GetPublicAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await LoadAsync(userId, tracking: false, ct);
        return await ToPublicAsync(user, ct);
    }

    public async Task<MyProfileDto> GetMineAsync(CancellationToken ct = default)
    {
        var user = await LoadAsync(currentUser.RequireUserId(), tracking: false, ct);
        return await ToMineAsync(user, ct);
    }

    public async Task<MyProfileDto> UpdateMineAsync(UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await LoadAsync(currentUser.RequireUserId(), tracking: true, ct);
        if (user.AccountType == AccountType.Individual)
            throw new ForbiddenException(LockedMessage);
        await validator.ValidateAndThrowAsync(request, ct);

        var errors = new Dictionary<string, string[]>();
        if (user.AccountType != AccountType.Admin && string.IsNullOrWhiteSpace(request.Province))
            errors["Province"] = ["Select your province."];
        if (user.AccountType == AccountType.Company && string.IsNullOrWhiteSpace(request.CompanyName))
            errors["CompanyName"] = ["Company name is required."];
        if (user.AccountType == AccountType.Individual && request.Gender is null)
            errors["Gender"] = ["Select M or F."];
        if (user.AccountType == AccountType.Individual && request.DateOfBirth is null)
            errors["DateOfBirth"] = ["Enter your date of birth."];
        if (errors.Count > 0) throw new FieldErrorsException(errors);

        user.FullName = request.FullName.Trim();
        user.PhoneNumber = request.PhoneNumber.Trim();
        user.Bio = NullIfBlank(request.Bio);

        if (user.CompanyProfile is { } company)
        {
            company.CompanyName = request.CompanyName!.Trim();
            company.Province = request.Province!;
            company.District = NullIfBlank(request.District);
            company.LocalLevel = company.District is null ? null : NullIfBlank(request.LocalLevel);
        }

        if (user.IndividualProfile is { } individual)
        {
            individual.Gender = request.Gender!.Value;
            individual.SocialMediaLink = NullIfBlank(request.SocialMediaLink);
            individual.AdditionalPhoneNumber = NullIfBlank(request.AdditionalPhoneNumber);
            individual.Province = request.Province!;
            individual.District = NullIfBlank(request.District);
            individual.LocalLevel = individual.District is null ? null : NullIfBlank(request.LocalLevel);
            individual.DateOfBirth = request.DateOfBirth;
        }

        await db.SaveChangesAsync(ct);
        return await ToMineAsync(user, ct);
    }

    public async Task<MyProfileDto> UpdatePhoneAsync(UpdatePhoneRequest request, CancellationToken ct = default)
    {
        var user = await LoadAsync(currentUser.RequireUserId(), tracking: true, ct);
        await phoneValidator.ValidateAndThrowAsync(request, ct);

        user.PhoneNumber = request.PhoneNumber.Trim();
        if (user.IndividualProfile is { } individual)
            individual.AdditionalPhoneNumber = NullIfBlank(request.AdditionalPhoneNumber);

        await db.SaveChangesAsync(ct);
        return await ToMineAsync(user, ct);
    }

    public async Task<MyProfileDto> SetAvatarAsync(FileUpload? image, CancellationToken ct = default)
    {
        var user = await LoadAsync(currentUser.RequireUserId(), tracking: true, ct);
        if (user.AccountType == AccountType.Individual)
            throw new ForbiddenException(LockedMessage);
        if (image is not null) ImageRules.EnsureValid(image, "Avatar");

        var oldAvatar = user.AvatarUrl;
        user.AvatarUrl = image is null ? null : await fileStorage.SaveAsync(image, "avatars", ct);
        await db.SaveChangesAsync(ct);
        await fileStorage.DeleteAsync(oldAvatar, ct);

        return await ToMineAsync(user, ct);
    }

    private async Task<AppUser> LoadAsync(Guid userId, bool tracking, CancellationToken ct)
    {
        var query = db.Users.Include(u => u.CompanyProfile).Include(u => u.IndividualProfile).AsQueryable();
        if (!tracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync(u => u.Id == userId, ct)
               ?? throw new NotFoundException("User not found.");
    }

    private async Task<PublicProfileDto> ToPublicAsync(AppUser user, CancellationToken ct)
    {
        var postCount = await db.Posts.CountAsync(p => p.AuthorId == user.Id, ct);
        return new PublicProfileDto(
            user.Id,
            user.FullName,
            user.AccountType,
            user.CompanyProfile?.CompanyName,
            user.AvatarUrl,
            user.Bio,
            user.CompanyProfile?.Province ?? user.IndividualProfile?.Province,
            user.CompanyProfile?.District ?? user.IndividualProfile?.District,
            user.CompanyProfile?.LocalLevel ?? user.IndividualProfile?.LocalLevel,
            user.IndividualProfile?.SocialMediaLink,
            user.IndividualProfile?.Gender,
            Age.From(user.IndividualProfile?.DateOfBirth),
            user.CreatedAt,
            postCount);
    }

    private async Task<MyProfileDto> ToMineAsync(AppUser user, CancellationToken ct) =>
        new(await ToPublicAsync(user, ct),
            user.Email ?? string.Empty,
            user.PhoneNumber,
            user.IndividualProfile?.AdditionalPhoneNumber,
            user.IndividualProfile?.DateOfBirth);

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

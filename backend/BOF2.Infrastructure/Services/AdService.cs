using System.Linq.Expressions;
using Feedora.Application.Ads;
using Feedora.Application.Common;
using Feedora.Domain.Entities;
using Feedora.Domain.Enums;
using Feedora.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Feedora.Infrastructure.Services;

public class AdService(
    AppDbContext db,
    IFileStorage fileStorage,
    IValidator<AdFormRequest> validator) : IAdService
{
    private const string ImageFolder = "ads";

    private static readonly Expression<Func<Ad, AdDto>> ToDto = a => new AdDto(
        a.Id, a.Title, a.Description, a.ImageUrl, a.LinkUrl, a.Placement,
        a.IsActive, a.StartsAt, a.EndsAt, a.CreatedAt);

    private static readonly Func<Ad, AdDto> MapToDto = ToDto.Compile();

    public async Task<IReadOnlyList<AdDto>> GetActiveAsync(AdPlacement placement, int count, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        return await db.Ads.AsNoTracking()
            .Where(a => a.Placement == placement && a.IsActive
                        && (a.StartsAt == null || a.StartsAt <= now)
                        && (a.EndsAt == null || a.EndsAt > now))
            .OrderBy(_ => EF.Functions.Random())
            .Take(Math.Clamp(count, 1, 10))
            .Select(ToDto)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<AdDto>> ListAllAsync(CancellationToken ct = default) =>
        await db.Ads.AsNoTracking().OrderByDescending(a => a.CreatedAt).Select(ToDto).ToListAsync(ct);

    public async Task<AdDto> CreateAsync(AdFormRequest request, FileUpload? image, CancellationToken ct = default)
    {
        await validator.ValidateAndThrowAsync(request, ct);
        if (image is null)
            throw new FieldErrorsException(new Dictionary<string, string[]> { ["Image"] = ["An image is required."] });
        ImageRules.EnsureValid(image, "Image");

        var ad = new Ad();
        Apply(ad, request);
        ad.ImageUrl = await fileStorage.SaveAsync(image, ImageFolder, ct);

        db.Ads.Add(ad);
        await db.SaveChangesAsync(ct);
        return MapToDto(ad);
    }

    public async Task<AdDto> UpdateAsync(Guid id, AdFormRequest request, FileUpload? image, CancellationToken ct = default)
    {
        var ad = await db.Ads.FirstOrDefaultAsync(a => a.Id == id, ct) ?? throw new NotFoundException("Ad not found.");
        await validator.ValidateAndThrowAsync(request, ct);
        if (image is not null) ImageRules.EnsureValid(image, "Image");

        Apply(ad, request);
        var oldImage = ad.ImageUrl;
        if (image is not null)
            ad.ImageUrl = await fileStorage.SaveAsync(image, ImageFolder, ct);

        await db.SaveChangesAsync(ct);
        if (oldImage != ad.ImageUrl)
            await fileStorage.DeleteAsync(oldImage, ct);

        return MapToDto(ad);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var ad = await db.Ads.FirstOrDefaultAsync(a => a.Id == id, ct) ?? throw new NotFoundException("Ad not found.");
        db.Ads.Remove(ad);
        await db.SaveChangesAsync(ct);
        await fileStorage.DeleteAsync(ad.ImageUrl, ct);
    }

    private static void Apply(Ad ad, AdFormRequest request)
    {
        ad.Title = request.Title.Trim();
        ad.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        ad.LinkUrl = string.IsNullOrWhiteSpace(request.LinkUrl) ? null : request.LinkUrl.Trim();
        ad.Placement = request.Placement;
        ad.IsActive = request.IsActive;
        ad.StartsAt = ToUtc(request.StartsAt);
        ad.EndsAt = ToUtc(request.EndsAt);
    }

    private static DateTime? ToUtc(DateTime? value) =>
        value is null ? null : DateTime.SpecifyKind(value.Value.ToUniversalTime(), DateTimeKind.Utc);
}

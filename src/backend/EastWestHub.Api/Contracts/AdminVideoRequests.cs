using System.ComponentModel.DataAnnotations;
using EastWestHub.Application.Content;
using EastWestHub.Domain.Entities;

namespace EastWestHub.Api.Contracts;

public sealed record SaveAdminCategoryRequest(
    [Required, StringLength(160)] string NameEn,
    [Required, StringLength(160)] string NameAr,
    [Required, StringLength(180)] string SlugEn,
    [Required, StringLength(180)] string SlugAr,
    string? DescriptionEn, string? DescriptionAr,
    [Url, StringLength(2048)] string? ImageUrl,
    int DisplayOrder, bool IsPublished)
{
    public Guid? ExpectedVersion { get; init; }
    public SaveAdminCategory ToModel() => new(NameEn, NameAr, SlugEn, SlugAr, DescriptionEn, DescriptionAr, ImageUrl, DisplayOrder, IsPublished);
}

public sealed record AdminVideoTagRequest([Required, StringLength(100)] string NameEn, [Required, StringLength(100)] string NameAr)
{
    public AdminVideoTagInput ToModel() => new(NameEn, NameAr);
}

public sealed record SaveAdminVideoRequest(
    [StringLength(2048)] string? YouTubeUrl,
    [Required, StringLength(250)] string TitleEn,
    [Required, StringLength(250)] string TitleAr,
    [Required, StringLength(180)] string SlugEn,
    [Required, StringLength(180)] string SlugAr,
    string? DescriptionEn, string? DescriptionAr,
    [MediaImageUrl, StringLength(2048)] string? ThumbnailUrl,
    [Required] Guid CategoryId,
    bool IsFeatured, bool IsPublished, int DisplayOrder,
    [MaxLength(20)] IReadOnlyList<AdminVideoTagRequest>? Tags,
    [EnumDataType(typeof(MediaContentType))] MediaContentType ContentType = MediaContentType.Video,
    [Range(1, int.MaxValue)] int? EpisodeNumber = null, [Range(1, int.MaxValue)] int? SeasonNumber = null,
    [StringLength(160)] string? GuestNameEn = null, [StringLength(160)] string? GuestNameAr = null,
    [StringLength(250)] string? SeoTitleEn = null, [StringLength(250)] string? SeoTitleAr = null,
    [StringLength(500)] string? SeoDescriptionEn = null, [StringLength(500)] string? SeoDescriptionAr = null)
{
    public Guid? ExpectedVersion { get; init; }
    public SaveAdminVideo ToModel() => new(YouTubeUrl, TitleEn, TitleAr, SlugEn, SlugAr, DescriptionEn, DescriptionAr, ThumbnailUrl, CategoryId, IsFeatured, IsPublished, DisplayOrder, (Tags ?? []).Select(tag => tag.ToModel()).ToArray(), ContentType, EpisodeNumber, SeasonNumber, GuestNameEn, GuestNameAr, SeoTitleEn, SeoTitleAr, SeoDescriptionEn, SeoDescriptionAr);
}

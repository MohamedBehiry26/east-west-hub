using System.ComponentModel.DataAnnotations;
using SpaceMedia.Application.Content;

namespace SpaceMedia.Api.Contracts;

public sealed record SaveAdminCategoryRequest(
    [Required, StringLength(160)] string NameEn,
    [Required, StringLength(160)] string NameAr,
    [Required, StringLength(180)] string SlugEn,
    [Required, StringLength(180)] string SlugAr,
    string? DescriptionEn, string? DescriptionAr,
    [Url, StringLength(2048)] string? ImageUrl,
    int DisplayOrder, bool IsPublished)
{
    public SaveAdminCategory ToModel() => new(NameEn, NameAr, SlugEn, SlugAr, DescriptionEn, DescriptionAr, ImageUrl, DisplayOrder, IsPublished);
}

public sealed record AdminVideoTagRequest([Required, StringLength(100)] string NameEn, [Required, StringLength(100)] string NameAr)
{
    public AdminVideoTagInput ToModel() => new(NameEn, NameAr);
}

public sealed record SaveAdminVideoRequest(
    [Required, StringLength(250)] string TitleEn,
    [Required, StringLength(250)] string TitleAr,
    [Required, StringLength(180)] string SlugEn,
    [Required, StringLength(180)] string SlugAr,
    string? DescriptionEn, string? DescriptionAr,
    [Url, StringLength(2048)] string? ThumbnailUrl,
    [Required] Guid CategoryId,
    bool IsFeatured, bool IsPublished, int DisplayOrder,
    [MaxLength(20)] IReadOnlyList<AdminVideoTagRequest> Tags)
{
    public SaveAdminVideo ToModel() => new(TitleEn, TitleAr, SlugEn, SlugAr, DescriptionEn, DescriptionAr, ThumbnailUrl, CategoryId, IsFeatured, IsPublished, DisplayOrder, (Tags ?? []).Select(tag => tag.ToModel()).ToArray());
}

public sealed record SyncYouTubeRequest([Required] Guid CategoryId);

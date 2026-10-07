using System.ComponentModel.DataAnnotations;
using SpaceMedia.Application.Content;

namespace SpaceMedia.Api.Contracts;

public sealed class SaveAdminServiceRequest
{
    [Required, StringLength(200)] public string TitleEn { get; init; } = "";
    [Required, StringLength(200)] public string TitleAr { get; init; } = "";
    [Required, StringLength(180)] public string SlugEn { get; init; } = "";
    [Required, StringLength(180)] public string SlugAr { get; init; } = "";
    public string? ShortDescriptionEn { get; init; }
    public string? ShortDescriptionAr { get; init; }
    public string? DescriptionEn { get; init; }
    public string? DescriptionAr { get; init; }
    public string? FeaturesEn { get; init; }
    public string? FeaturesAr { get; init; }
    public string? ProcessEn { get; init; }
    public string? ProcessAr { get; init; }
    [StringLength(2048)] public string? ImageUrl { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsPublished { get; init; }
    public string? SeoTitleEn { get; init; }
    public string? SeoTitleAr { get; init; }
    public string? SeoDescriptionEn { get; init; }
    public string? SeoDescriptionAr { get; init; }

    public SaveAdminService ToModel() => new(TitleEn.Trim(), TitleAr.Trim(), SlugEn.Trim(), SlugAr.Trim(),
        ShortDescriptionEn, ShortDescriptionAr, DescriptionEn, DescriptionAr, FeaturesEn, FeaturesAr,
        ProcessEn, ProcessAr, ImageUrl, DisplayOrder, IsPublished,
        SeoTitleEn, SeoTitleAr, SeoDescriptionEn, SeoDescriptionAr);
}

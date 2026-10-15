using System.ComponentModel.DataAnnotations;
using EastWestHub.Application.Content;

namespace EastWestHub.Api.Contracts;

public sealed class SaveAdminArticleRequest
{
    public Guid? ExpectedVersion { get; init; }
    public bool CreateIfAbsent { get; init; }
    [Required, StringLength(250)] public string TitleEn { get; init; } = "";
    [Required, StringLength(250)] public string TitleAr { get; init; } = "";
    [Required, StringLength(180)] public string SlugEn { get; init; } = "";
    [Required, StringLength(180)] public string SlugAr { get; init; } = "";
    [StringLength(500)] public string? ExcerptEn { get; init; }
    [StringLength(500)] public string? ExcerptAr { get; init; }
    public string? ContentEn { get; init; }
    public string? ContentAr { get; init; }
    [StringLength(2048)] public string? CoverImageUrl { get; init; }
    public Guid AuthorId { get; init; }
    [StringLength(160)] public string? AuthorName { get; init; }
    public DateTimeOffset? PublishedAt { get; init; }
    public bool IsPublished { get; init; }
    [StringLength(250)] public string? SeoTitleEn { get; init; }
    [StringLength(250)] public string? SeoTitleAr { get; init; }
    [StringLength(500)] public string? SeoDescriptionEn { get; init; }
    [StringLength(500)] public string? SeoDescriptionAr { get; init; }

    public SaveAdminArticle ToModel() => new(TitleEn.Trim(), TitleAr.Trim(), SlugEn.Trim(), SlugAr.Trim(),
        ExcerptEn, ExcerptAr, ContentEn, ContentAr, CoverImageUrl, AuthorId,
        PublishedAt, IsPublished, SeoTitleEn, SeoTitleAr, SeoDescriptionEn, SeoDescriptionAr, AuthorName);
}

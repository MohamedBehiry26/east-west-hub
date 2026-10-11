using System.ComponentModel.DataAnnotations;
using EastWestHub.Application.Content;

namespace EastWestHub.Api.Contracts;

public sealed class SaveAdminPortfolioRequest
{
    [Required, StringLength(200)] public string TitleEn { get; init; } = "";
    [Required, StringLength(200)] public string TitleAr { get; init; } = "";
    [Required, StringLength(180)] public string SlugEn { get; init; } = "";
    [Required, StringLength(180)] public string SlugAr { get; init; } = "";
    [StringLength(160)] public string? Client { get; init; }
    [StringLength(120)] public string? CategoryEn { get; init; }
    [StringLength(120)] public string? CategoryAr { get; init; }
    public string? DescriptionEn { get; init; }
    public string? DescriptionAr { get; init; }
    public string? ChallengeEn { get; init; }
    public string? ChallengeAr { get; init; }
    public string? ApproachEn { get; init; }
    public string? ApproachAr { get; init; }
    public string? SolutionEn { get; init; }
    public string? SolutionAr { get; init; }
    public string? ResultsEn { get; init; }
    public string? ResultsAr { get; init; }
    [StringLength(2048)] public string? CoverImageUrl { get; init; }
    public DateOnly? ProjectDate { get; init; }
    public int DisplayOrder { get; init; }
    public bool IsFeatured { get; init; }
    public bool IsPublished { get; init; }
    public string? SeoTitleEn { get; init; }
    public string? SeoTitleAr { get; init; }
    public string? SeoDescriptionEn { get; init; }
    public string? SeoDescriptionAr { get; init; }
    public List<SaveAdminPortfolioImageRequest> Images { get; init; } = [];
    public List<Guid> ServiceIds { get; init; } = [];

    public SaveAdminPortfolio ToModel() => new(TitleEn.Trim(), TitleAr.Trim(), SlugEn.Trim(), SlugAr.Trim(), Client,
        CategoryEn, CategoryAr, DescriptionEn, DescriptionAr, ChallengeEn, ChallengeAr, ApproachEn, ApproachAr, SolutionEn, SolutionAr, ResultsEn, ResultsAr,
        CoverImageUrl, ProjectDate, DisplayOrder, IsFeatured, IsPublished, SeoTitleEn, SeoTitleAr,
        SeoDescriptionEn, SeoDescriptionAr, (Images ?? []).Select(x => new SaveAdminPortfolioImage(x.ImageUrl, x.AltTextEn, x.AltTextAr, x.DisplayOrder)).ToArray(), ServiceIds ?? []);
}

public sealed class SaveAdminPortfolioImageRequest
{
    [StringLength(2048)] public string? ImageUrl { get; init; }
    [StringLength(250)] public string? AltTextEn { get; init; }
    [StringLength(250)] public string? AltTextAr { get; init; }
    public int DisplayOrder { get; init; }
}

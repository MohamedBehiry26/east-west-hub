namespace SpaceMedia.Application.Content;

public sealed record AdminServiceContent(
    Guid Id, string TitleEn, string TitleAr, string SlugEn, string SlugAr,
    string? ShortDescriptionEn, string? ShortDescriptionAr, string? DescriptionEn, string? DescriptionAr,
    string? FeaturesEn, string? FeaturesAr, string? ProcessEn, string? ProcessAr,
    string? ImageUrl, int DisplayOrder, bool IsPublished,
    string? SeoTitleEn, string? SeoTitleAr, string? SeoDescriptionEn, string? SeoDescriptionAr);

public sealed record AdminPortfolioImageContent(
    Guid Id, string ImageUrl, string? AltTextEn, string? AltTextAr, int DisplayOrder);

public sealed record AdminPortfolioContent(
    Guid Id, string TitleEn, string TitleAr, string SlugEn, string SlugAr, string? Client, string? CategoryEn, string? CategoryAr,
    string? DescriptionEn, string? DescriptionAr, string? ChallengeEn, string? ChallengeAr, string? ApproachEn, string? ApproachAr,
    string? SolutionEn, string? SolutionAr, string? ResultsEn, string? ResultsAr,
    string? CoverImageUrl, DateOnly? ProjectDate, int DisplayOrder, bool IsFeatured, bool IsPublished,
    string? SeoTitleEn, string? SeoTitleAr, string? SeoDescriptionEn, string? SeoDescriptionAr,
    IReadOnlyList<AdminPortfolioImageContent> Images, IReadOnlyList<Guid> ServiceIds);

public sealed record SaveAdminService(
    string TitleEn, string TitleAr, string SlugEn, string SlugAr,
    string? ShortDescriptionEn, string? ShortDescriptionAr, string? DescriptionEn, string? DescriptionAr,
    string? FeaturesEn, string? FeaturesAr, string? ProcessEn, string? ProcessAr,
    string? ImageUrl, int DisplayOrder, bool IsPublished,
    string? SeoTitleEn, string? SeoTitleAr, string? SeoDescriptionEn, string? SeoDescriptionAr);

public sealed record SaveAdminPortfolioImage(string? ImageUrl, string? AltTextEn, string? AltTextAr, int DisplayOrder);

public sealed record SaveAdminPortfolio(
    string TitleEn, string TitleAr, string SlugEn, string SlugAr, string? Client, string? CategoryEn, string? CategoryAr,
    string? DescriptionEn, string? DescriptionAr, string? ChallengeEn, string? ChallengeAr, string? ApproachEn, string? ApproachAr,
    string? SolutionEn, string? SolutionAr, string? ResultsEn, string? ResultsAr,
    string? CoverImageUrl, DateOnly? ProjectDate, int DisplayOrder, bool IsFeatured, bool IsPublished,
    string? SeoTitleEn, string? SeoTitleAr, string? SeoDescriptionEn, string? SeoDescriptionAr,
    IReadOnlyList<SaveAdminPortfolioImage> Images, IReadOnlyList<Guid> ServiceIds);

public interface IAdminPortfolioManager
{
    Task<IReadOnlyList<AdminServiceContent>> GetServicesAsync(CancellationToken cancellationToken);
    Task<AdminServiceContent?> SaveServiceAsync(Guid? id, SaveAdminService input, CancellationToken cancellationToken);
    Task<bool> DeleteServiceAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminPortfolioContent>> GetPortfolioAsync(CancellationToken cancellationToken);
    Task<AdminPortfolioContent?> SavePortfolioAsync(Guid? id, SaveAdminPortfolio input, CancellationToken cancellationToken);
    Task<bool> DeletePortfolioAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class AdminContentConflictException(string message) : Exception(message);

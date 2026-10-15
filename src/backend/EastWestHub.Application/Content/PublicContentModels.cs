namespace EastWestHub.Application.Content;

using EastWestHub.Domain.Entities;

public sealed record PublicPage<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

public sealed record PublicCategory(Guid Id, string Slug, string AlternateSlug, string Name, string? Description, string? ImageUrl, int DisplayOrder);
public sealed record PublicTag(string Slug, string Name);

public sealed record PublicVideo(
    Guid Id, string Slug, string AlternateSlug, string Title, string? Description, string? ThumbnailUrl,
    string? YouTubeVideoId, DateTimeOffset? PublishedAt, TimeSpan? Duration,
    bool IsFeatured, PublicCategory Category, IReadOnlyList<string> Tags,
    MediaContentType ContentType = MediaContentType.Video, int? EpisodeNumber = null, int? SeasonNumber = null,
    string? GuestName = null, string? SeoTitle = null, string? SeoDescription = null);

public sealed record PublicService(
    Guid Id, string Slug, string AlternateSlug, string Title, string? ShortDescription, string? Description,
    string? Features, string? Process, string? ImageUrl, string? SeoTitle, string? SeoDescription, int DisplayOrder,
    IReadOnlyList<PublicRelatedPortfolioProject> RelatedProjects);

public sealed record PublicRelatedPortfolioProject(Guid Id, string Slug, string Title, string? CoverImageUrl);

public sealed record PublicPortfolioImage(string ImageUrl, string? AltText, int DisplayOrder);

public sealed record PublicPortfolioProject(
    Guid Id, string Slug, string AlternateSlug, string Title, string? Client, string? Category, string? Description,
    string? Challenge, string? Approach, string? Solution, string? Results, string? CoverImageUrl,
    DateOnly? ProjectDate, int DisplayOrder, bool IsFeatured, string? SeoTitle, string? SeoDescription,
    IReadOnlyList<PublicPortfolioImage> Images, IReadOnlyList<string> ServicesUsed);

public sealed record PublicArticle(
    Guid Id, string Slug, string AlternateSlug, string Title, string? Excerpt, string? Content,
    string? CoverImageUrl, string AuthorName, DateTimeOffset? PublishedAt,
    string? SeoTitle, string? SeoDescription);

public sealed record PublicSocialLink(string Platform, string Url);

public sealed record PublicSiteSettings(
    string AgencyName, string? AgencyDescription, string? LogoUrl, string? FaviconUrl,
    string? Email, string? Phone, string? Address, IReadOnlyList<PublicSocialLink> SocialLinks, string? HeroYouTubeVideoId = null, string? HeroMp4Url = null, string? HeroPosterImageUrl = null);

public interface IPublicContentReader
{
    Task<PublicSiteSettings?> GetSiteSettingsAsync(bool isArabic, CancellationToken cancellationToken);
    Task<IReadOnlyList<PublicCategory>> GetCategoriesAsync(bool isArabic, CancellationToken cancellationToken);
    Task<IReadOnlyList<PublicTag>> GetTagsAsync(bool isArabic, CancellationToken cancellationToken);
    Task<PublicPage<PublicVideo>> GetVideosAsync(bool isArabic, int page, int pageSize, string? categorySlug, string? search, string? tag, bool? featured, string? order, CancellationToken cancellationToken);
    Task<PublicVideo?> GetVideoAsync(bool isArabic, string slug, CancellationToken cancellationToken);
    Task<PublicPage<PublicVideo>> GetPodcastsAsync(bool isArabic, int page, int pageSize, string? search, CancellationToken cancellationToken);
    Task<PublicVideo?> GetPodcastAsync(bool isArabic, string slug, CancellationToken cancellationToken);
    Task<PublicPage<PublicService>> GetServicesAsync(bool isArabic, int page, int pageSize, CancellationToken cancellationToken);
    Task<PublicService?> GetServiceAsync(bool isArabic, string slug, CancellationToken cancellationToken);
    Task<PublicPage<PublicPortfolioProject>> GetPortfolioAsync(bool isArabic, int page, int pageSize, CancellationToken cancellationToken);
    Task<PublicPortfolioProject?> GetPortfolioProjectAsync(bool isArabic, string slug, CancellationToken cancellationToken);
    Task<PublicPage<PublicArticle>> GetArticlesAsync(bool isArabic, int page, int pageSize, CancellationToken cancellationToken);
    Task<PublicArticle?> GetArticleAsync(bool isArabic, string slug, CancellationToken cancellationToken);
}

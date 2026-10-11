using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using EastWestHub.Application.Content;
using EastWestHub.Domain.Entities;
using EastWestHub.Infrastructure.Persistence;

namespace EastWestHub.Infrastructure.Content;

public sealed class PublicContentReader(EastWestHubDbContext dbContext) : IPublicContentReader
{
    public async Task<PublicSiteSettings?> GetSiteSettingsAsync(bool isArabic, CancellationToken cancellationToken)
    {
        var setting = await dbContext.SiteSettings.AsNoTracking()
            .OrderBy(x => x.Id)
            .Select(x => new
            {
                x.AgencyNameEn, x.AgencyNameAr, x.AgencyDescriptionEn, x.AgencyDescriptionAr,
                x.LogoUrl, x.FaviconUrl, x.Email, x.Phone, x.AddressEn, x.AddressAr, x.HeroYouTubeVideoId,
                SocialLinks = x.SocialLinks.Where(link => link.IsVisible).OrderBy(link => link.DisplayOrder)
                    .Select(link => new PublicSocialLink(link.Platform, link.Url)).ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        return setting is null ? null : new PublicSiteSettings(
            isArabic ? setting.AgencyNameAr : setting.AgencyNameEn,
            isArabic ? setting.AgencyDescriptionAr : setting.AgencyDescriptionEn,
            setting.LogoUrl, setting.FaviconUrl, setting.Email, setting.Phone,
            isArabic ? setting.AddressAr : setting.AddressEn, setting.SocialLinks, setting.HeroYouTubeVideoId);
    }

    public async Task<IReadOnlyList<PublicCategory>> GetCategoriesAsync(bool isArabic, CancellationToken cancellationToken) =>
        await dbContext.Categories.AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => isArabic ? x.NameAr : x.NameEn)
            .Select(x => new PublicCategory(
                x.Id, isArabic ? x.SlugAr : x.SlugEn, isArabic ? x.SlugEn : x.SlugAr,
                isArabic ? x.NameAr : x.NameEn,
                isArabic ? x.DescriptionAr : x.DescriptionEn,
                x.ImageUrl, x.DisplayOrder))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<PublicTag>> GetTagsAsync(bool isArabic, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        return await dbContext.VideoTags.AsNoTracking()
            .Where(link => link.Video.ContentType != MediaContentType.Podcast
                && link.Video.IsPublished && (link.Video.PublishedAt == null || link.Video.PublishedAt <= now)
                && link.Video.Category.IsPublished)
            .Select(link => new { Slug = isArabic ? link.Tag.SlugAr : link.Tag.SlugEn, Name = isArabic ? link.Tag.NameAr : link.Tag.NameEn })
            .Distinct().OrderBy(tag => tag.Name)
            .Select(tag => new PublicTag(tag.Slug, tag.Name)).ToListAsync(cancellationToken);
    }

    public async Task<PublicPage<PublicVideo>> GetVideosAsync(
        bool isArabic, int page, int pageSize, string? categorySlug, string? search, string? tag, bool? featured, string? order, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var query = dbContext.Videos.AsNoTracking()
            .Where(x => x.ContentType != MediaContentType.Podcast
                && x.IsPublished && (x.PublishedAt == null || x.PublishedAt <= now)
                && x.Category.IsPublished);

        if (!string.IsNullOrWhiteSpace(categorySlug))
        {
            query = query.Where(x => (isArabic ? x.Category.SlugAr : x.Category.SlugEn) == categorySlug);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.TitleEn.Contains(term) || x.TitleAr.Contains(term)
                || (x.DescriptionEn != null && x.DescriptionEn.Contains(term))
                || (x.DescriptionAr != null && x.DescriptionAr.Contains(term)));
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            query = query.Where(x => x.VideoTags.Any(link => (isArabic ? link.Tag.SlugAr : link.Tag.SlugEn) == tag));
        }

        if (featured is not null) query = query.Where(x => x.IsFeatured == featured.Value);

        var ordered = string.Equals(order, "latest", StringComparison.OrdinalIgnoreCase)
            ? query.OrderByDescending(x => x.PublishedAt).ThenByDescending(x => x.IsFeatured).ThenBy(x => x.DisplayOrder)
            : string.Equals(order, "oldest", StringComparison.OrdinalIgnoreCase)
                ? query.OrderBy(x => x.PublishedAt).ThenBy(x => x.DisplayOrder)
                : query.OrderByDescending(x => x.IsFeatured).ThenBy(x => x.DisplayOrder).ThenByDescending(x => x.PublishedAt);

        var projected = ordered
            .Select(x => new PublicVideo(
                x.Id, isArabic ? x.SlugAr : x.SlugEn, isArabic ? x.SlugEn : x.SlugAr,
                isArabic ? x.TitleAr : x.TitleEn,
                isArabic ? x.DescriptionAr : x.DescriptionEn,
                x.ThumbnailUrl ?? x.YouTubeThumbnailUrl, x.YouTubeVideoId, x.PublishedAt, x.Duration, x.IsFeatured,
                new PublicCategory(x.Category.Id,
                    isArabic ? x.Category.SlugAr : x.Category.SlugEn,
                    isArabic ? x.Category.SlugEn : x.Category.SlugAr,
                    isArabic ? x.Category.NameAr : x.Category.NameEn,
                    isArabic ? x.Category.DescriptionAr : x.Category.DescriptionEn,
                    x.Category.ImageUrl, x.Category.DisplayOrder),
                x.VideoTags.OrderBy(link => isArabic ? link.Tag.NameAr : link.Tag.NameEn)
                    .Select(link => isArabic ? link.Tag.NameAr : link.Tag.NameEn).ToList(),
                x.ContentType, x.EpisodeNumber, x.SeasonNumber, isArabic ? x.GuestNameAr : x.GuestNameEn,
                isArabic ? x.SeoTitleAr : x.SeoTitleEn, isArabic ? x.SeoDescriptionAr : x.SeoDescriptionEn));

        return await ToPageAsync(projected, page, pageSize, cancellationToken);
    }

    public Task<PublicVideo?> GetVideoAsync(bool isArabic, string slug, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        return dbContext.Videos.AsNoTracking()
            .Where(x => x.IsPublished && (x.PublishedAt == null || x.PublishedAt <= now)
                && x.ContentType != MediaContentType.Podcast && x.Category.IsPublished && (isArabic ? x.SlugAr : x.SlugEn) == slug)
            .Select(x => new PublicVideo(
                x.Id, isArabic ? x.SlugAr : x.SlugEn, isArabic ? x.SlugEn : x.SlugAr,
                isArabic ? x.TitleAr : x.TitleEn,
                isArabic ? x.DescriptionAr : x.DescriptionEn,
                x.ThumbnailUrl ?? x.YouTubeThumbnailUrl, x.YouTubeVideoId, x.PublishedAt, x.Duration, x.IsFeatured,
                new PublicCategory(x.Category.Id,
                    isArabic ? x.Category.SlugAr : x.Category.SlugEn,
                    isArabic ? x.Category.SlugEn : x.Category.SlugAr,
                    isArabic ? x.Category.NameAr : x.Category.NameEn,
                    isArabic ? x.Category.DescriptionAr : x.Category.DescriptionEn,
                    x.Category.ImageUrl, x.Category.DisplayOrder),
                x.VideoTags.OrderBy(link => isArabic ? link.Tag.NameAr : link.Tag.NameEn)
                    .Select(link => isArabic ? link.Tag.NameAr : link.Tag.NameEn).ToList(),
                x.ContentType, x.EpisodeNumber, x.SeasonNumber, isArabic ? x.GuestNameAr : x.GuestNameEn,
                isArabic ? x.SeoTitleAr : x.SeoTitleEn, isArabic ? x.SeoDescriptionAr : x.SeoDescriptionEn))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<PublicPage<PublicVideo>> GetPodcastsAsync(bool isArabic, int page, int pageSize, string? search, CancellationToken cancellationToken) =>
        GetMediaByTypeAsync(isArabic, page, pageSize, search, MediaContentType.Podcast, cancellationToken);

    public Task<PublicVideo?> GetPodcastAsync(bool isArabic, string slug, CancellationToken cancellationToken) =>
        GetMediaByTypeBySlugAsync(isArabic, slug, MediaContentType.Podcast, cancellationToken);

    private async Task<PublicPage<PublicVideo>> GetMediaByTypeAsync(bool isArabic, int page, int pageSize, string? search, MediaContentType contentType, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var query = dbContext.Videos.AsNoTracking()
            .Where(x => x.ContentType == contentType && x.IsPublished && (x.PublishedAt == null || x.PublishedAt <= now) && x.Category.IsPublished);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.TitleEn.Contains(term) || x.TitleAr.Contains(term)
                || (x.DescriptionEn != null && x.DescriptionEn.Contains(term)) || (x.DescriptionAr != null && x.DescriptionAr.Contains(term))
                || (x.GuestNameEn != null && x.GuestNameEn.Contains(term)) || (x.GuestNameAr != null && x.GuestNameAr.Contains(term)));
        }
        var ordered = query.OrderByDescending(x => x.IsFeatured).ThenBy(x => x.DisplayOrder).ThenByDescending(x => x.PublishedAt)
            .Select(x => new PublicVideo(
                x.Id, isArabic ? x.SlugAr : x.SlugEn, isArabic ? x.SlugEn : x.SlugAr,
                isArabic ? x.TitleAr : x.TitleEn, isArabic ? x.DescriptionAr : x.DescriptionEn,
                x.ThumbnailUrl ?? x.YouTubeThumbnailUrl, x.YouTubeVideoId, x.PublishedAt, x.Duration, x.IsFeatured,
                new PublicCategory(x.Category.Id, isArabic ? x.Category.SlugAr : x.Category.SlugEn,
                    isArabic ? x.Category.SlugEn : x.Category.SlugAr, isArabic ? x.Category.NameAr : x.Category.NameEn,
                    isArabic ? x.Category.DescriptionAr : x.Category.DescriptionEn, x.Category.ImageUrl, x.Category.DisplayOrder),
                x.VideoTags.OrderBy(link => isArabic ? link.Tag.NameAr : link.Tag.NameEn)
                    .Select(link => isArabic ? link.Tag.NameAr : link.Tag.NameEn).ToList(),
                x.ContentType, x.EpisodeNumber, x.SeasonNumber, isArabic ? x.GuestNameAr : x.GuestNameEn,
                isArabic ? x.SeoTitleAr : x.SeoTitleEn, isArabic ? x.SeoDescriptionAr : x.SeoDescriptionEn));
        return await ToPageAsync(ordered, page, pageSize, cancellationToken);
    }

    private Task<PublicVideo?> GetMediaByTypeBySlugAsync(bool isArabic, string slug, MediaContentType contentType, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        return dbContext.Videos.AsNoTracking()
            .Where(x => x.ContentType == contentType && x.IsPublished && (x.PublishedAt == null || x.PublishedAt <= now)
                && x.Category.IsPublished && (isArabic ? x.SlugAr : x.SlugEn) == slug)
            .Select(x => new PublicVideo(
                x.Id, isArabic ? x.SlugAr : x.SlugEn, isArabic ? x.SlugEn : x.SlugAr,
                isArabic ? x.TitleAr : x.TitleEn, isArabic ? x.DescriptionAr : x.DescriptionEn,
                x.ThumbnailUrl ?? x.YouTubeThumbnailUrl, x.YouTubeVideoId, x.PublishedAt, x.Duration, x.IsFeatured,
                new PublicCategory(x.Category.Id, isArabic ? x.Category.SlugAr : x.Category.SlugEn,
                    isArabic ? x.Category.SlugEn : x.Category.SlugAr, isArabic ? x.Category.NameAr : x.Category.NameEn,
                    isArabic ? x.Category.DescriptionAr : x.Category.DescriptionEn, x.Category.ImageUrl, x.Category.DisplayOrder),
                x.VideoTags.OrderBy(link => isArabic ? link.Tag.NameAr : link.Tag.NameEn)
                    .Select(link => isArabic ? link.Tag.NameAr : link.Tag.NameEn).ToList(),
                x.ContentType, x.EpisodeNumber, x.SeasonNumber, isArabic ? x.GuestNameAr : x.GuestNameEn,
                isArabic ? x.SeoTitleAr : x.SeoTitleEn, isArabic ? x.SeoDescriptionAr : x.SeoDescriptionEn))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<PublicPage<PublicService>> GetServicesAsync(
        bool isArabic, int page, int pageSize, CancellationToken cancellationToken)
    {
        var query = dbContext.Services.AsNoTracking().Where(x => x.IsPublished)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => isArabic ? x.TitleAr : x.TitleEn)
            .Select(x => new PublicService(
                x.Id, isArabic ? x.SlugAr : x.SlugEn, isArabic ? x.SlugEn : x.SlugAr,
                isArabic ? x.TitleAr : x.TitleEn,
                isArabic ? x.ShortDescriptionAr : x.ShortDescriptionEn,
                isArabic ? x.DescriptionAr : x.DescriptionEn,
                isArabic ? x.FeaturesAr : x.FeaturesEn,
                isArabic ? x.ProcessAr : x.ProcessEn,
                x.ImageUrl,
                isArabic ? x.SeoTitleAr : x.SeoTitleEn,
                isArabic ? x.SeoDescriptionAr : x.SeoDescriptionEn,
                x.DisplayOrder,
                x.PortfolioProjects.Where(link => link.PortfolioProject.IsPublished).OrderBy(link => link.PortfolioProject.DisplayOrder)
                    .Select(link => new PublicRelatedPortfolioProject(link.PortfolioProject.Id,
                        isArabic ? link.PortfolioProject.SlugAr : link.PortfolioProject.SlugEn,
                        isArabic ? link.PortfolioProject.TitleAr : link.PortfolioProject.TitleEn,
                        link.PortfolioProject.CoverImageUrl)).ToList()));
        return await ToPageAsync(query, page, pageSize, cancellationToken);
    }

    public Task<PublicService?> GetServiceAsync(bool isArabic, string slug, CancellationToken cancellationToken) =>
        dbContext.Services.AsNoTracking()
            .Where(x => x.IsPublished && (isArabic ? x.SlugAr : x.SlugEn) == slug)
            .Select(x => new PublicService(
                x.Id, isArabic ? x.SlugAr : x.SlugEn, isArabic ? x.SlugEn : x.SlugAr,
                isArabic ? x.TitleAr : x.TitleEn,
                isArabic ? x.ShortDescriptionAr : x.ShortDescriptionEn,
                isArabic ? x.DescriptionAr : x.DescriptionEn,
                isArabic ? x.FeaturesAr : x.FeaturesEn,
                isArabic ? x.ProcessAr : x.ProcessEn,
                x.ImageUrl,
                isArabic ? x.SeoTitleAr : x.SeoTitleEn,
                isArabic ? x.SeoDescriptionAr : x.SeoDescriptionEn,
                x.DisplayOrder,
                x.PortfolioProjects.Where(link => link.PortfolioProject.IsPublished).OrderBy(link => link.PortfolioProject.DisplayOrder)
                    .Select(link => new PublicRelatedPortfolioProject(link.PortfolioProject.Id,
                        isArabic ? link.PortfolioProject.SlugAr : link.PortfolioProject.SlugEn,
                        isArabic ? link.PortfolioProject.TitleAr : link.PortfolioProject.TitleEn,
                        link.PortfolioProject.CoverImageUrl)).ToList()))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<PublicPage<PublicPortfolioProject>> GetPortfolioAsync(
        bool isArabic, int page, int pageSize, CancellationToken cancellationToken)
    {
        var query = dbContext.PortfolioProjects.AsNoTracking().Where(x => x.IsPublished)
            .OrderByDescending(x => x.IsFeatured).ThenBy(x => x.DisplayOrder).ThenByDescending(x => x.ProjectDate)
            .Select(PortfolioProjection(isArabic));
        return await ToPageAsync(query, page, pageSize, cancellationToken);
    }

    public Task<PublicPortfolioProject?> GetPortfolioProjectAsync(bool isArabic, string slug, CancellationToken cancellationToken) =>
        dbContext.PortfolioProjects.AsNoTracking()
            .Where(x => x.IsPublished && (isArabic ? x.SlugAr : x.SlugEn) == slug)
            .Select(PortfolioProjection(isArabic))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<PublicPage<PublicArticle>> GetArticlesAsync(
        bool isArabic, int page, int pageSize, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var query = dbContext.Articles.AsNoTracking()
            .Where(x => x.IsPublished && x.PublishedAt != null && x.PublishedAt <= now)
            .OrderByDescending(x => x.PublishedAt)
            .Select(ArticleProjection(isArabic));
        return await ToPageAsync(query, page, pageSize, cancellationToken);
    }

    public Task<PublicArticle?> GetArticleAsync(bool isArabic, string slug, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        return dbContext.Articles.AsNoTracking()
            .Where(x => x.IsPublished && x.PublishedAt != null && x.PublishedAt <= now
                && (isArabic ? x.SlugAr : x.SlugEn) == slug)
            .Select(ArticleProjection(isArabic))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static Expression<Func<PortfolioProject, PublicPortfolioProject>> PortfolioProjection(bool isArabic) =>
        x => new PublicPortfolioProject(
                x.Id, isArabic ? x.SlugAr : x.SlugEn, isArabic ? x.SlugEn : x.SlugAr,
                isArabic ? x.TitleAr : x.TitleEn, x.Client, isArabic ? x.CategoryAr : x.CategoryEn,
                isArabic ? x.DescriptionAr : x.DescriptionEn,
                isArabic ? x.ChallengeAr : x.ChallengeEn,
                isArabic ? x.ApproachAr : x.ApproachEn,
                isArabic ? x.SolutionAr : x.SolutionEn,
                isArabic ? x.ResultsAr : x.ResultsEn,
                x.CoverImageUrl, x.ProjectDate, x.DisplayOrder, x.IsFeatured,
                isArabic ? x.SeoTitleAr : x.SeoTitleEn,
                isArabic ? x.SeoDescriptionAr : x.SeoDescriptionEn,
                x.Images.OrderBy(image => image.DisplayOrder)
                    .Select(image => new PublicPortfolioImage(
                        image.ImageUrl, isArabic ? image.AltTextAr : image.AltTextEn, image.DisplayOrder))
                    .ToList(),
                x.ServicesUsed.OrderBy(link => isArabic ? link.Service.TitleAr : link.Service.TitleEn)
                    .Select(link => isArabic ? link.Service.TitleAr : link.Service.TitleEn).ToList());

    private static Expression<Func<Article, PublicArticle>> ArticleProjection(bool isArabic) =>
        x => new PublicArticle(
                x.Id, isArabic ? x.SlugAr : x.SlugEn, isArabic ? x.SlugEn : x.SlugAr,
                isArabic ? x.TitleAr : x.TitleEn,
                isArabic ? x.ExcerptAr : x.ExcerptEn,
                isArabic ? x.ContentAr : x.ContentEn,
                x.CoverImageUrl, x.Author.DisplayName, x.PublishedAt,
                isArabic ? x.SeoTitleAr : x.SeoTitleEn,
                isArabic ? x.SeoDescriptionAr : x.SeoDescriptionEn);

    private static async Task<PublicPage<T>> ToPageAsync<T>(
        IQueryable<T> query, int page, int pageSize, CancellationToken cancellationToken)
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return new PublicPage<T>(items, page, pageSize, totalCount);
    }
}

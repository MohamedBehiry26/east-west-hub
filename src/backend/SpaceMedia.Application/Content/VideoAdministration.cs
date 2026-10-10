namespace SpaceMedia.Application.Content;

using SpaceMedia.Domain.Entities;

public sealed record SaveAdminCategory(string NameEn, string NameAr, string SlugEn, string SlugAr, string? DescriptionEn, string? DescriptionAr, string? ImageUrl, int DisplayOrder, bool IsPublished);
public sealed record AdminCategoryContent(Guid Id, string NameEn, string NameAr, string SlugEn, string SlugAr, string? DescriptionEn, string? DescriptionAr, string? ImageUrl, int DisplayOrder, bool IsPublished);
public sealed record AdminVideoTagInput(string NameEn, string NameAr);
public sealed record SaveAdminVideo(string? YouTubeUrl, string TitleEn, string TitleAr, string SlugEn, string SlugAr, string? DescriptionEn, string? DescriptionAr, string? ThumbnailUrl, Guid CategoryId, bool IsFeatured, bool IsPublished, int DisplayOrder, IReadOnlyList<AdminVideoTagInput> Tags,
    MediaContentType ContentType = MediaContentType.Video, int? EpisodeNumber = null, int? SeasonNumber = null, string? GuestNameEn = null, string? GuestNameAr = null, string? SeoTitleEn = null, string? SeoTitleAr = null, string? SeoDescriptionEn = null, string? SeoDescriptionAr = null);
public sealed record AdminVideoContent(Guid Id, string? YouTubeVideoId, string TitleEn, string TitleAr, string SlugEn, string SlugAr, string? DescriptionEn, string? DescriptionAr, string? ThumbnailUrl, DateTimeOffset? PublishedAt, TimeSpan? Duration, Guid CategoryId, string CategoryNameEn, string CategoryNameAr, bool IsFeatured, bool IsPublished, int DisplayOrder, IReadOnlyList<AdminVideoTagInput> Tags,
    MediaContentType ContentType = MediaContentType.Video, int? EpisodeNumber = null, int? SeasonNumber = null, string? GuestNameEn = null, string? GuestNameAr = null, string? SeoTitleEn = null, string? SeoTitleAr = null, string? SeoDescriptionEn = null, string? SeoDescriptionAr = null);

public interface IAdminVideoManager
{
    Task<IReadOnlyList<AdminCategoryContent>> GetCategoriesAsync(CancellationToken cancellationToken);
    Task<AdminCategoryContent?> SaveCategoryAsync(Guid? id, SaveAdminCategory input, CancellationToken cancellationToken);
    Task<bool> DeleteCategoryAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminVideoContent>> GetVideosAsync(CancellationToken cancellationToken);
    Task<AdminVideoContent?> SaveVideoAsync(Guid? id, SaveAdminVideo input, CancellationToken cancellationToken);
    Task<bool> DeleteVideoAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class VideoAdministrationConflictException(string message) : Exception(message);

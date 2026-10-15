namespace EastWestHub.Application.Content;

public sealed record AdminAuthorContent(Guid Id, string DisplayName);

public sealed record AdminArticleContent(
    Guid Id, string TitleEn, string TitleAr, string SlugEn, string SlugAr,
    string? ExcerptEn, string? ExcerptAr, string? ContentEn, string? ContentAr,
    string? CoverImageUrl, Guid AuthorId, string AuthorName,
    DateTimeOffset? PublishedAt, bool IsPublished,
    string? SeoTitleEn, string? SeoTitleAr, string? SeoDescriptionEn, string? SeoDescriptionAr, Guid Version = default);

public sealed record SaveAdminArticle(
    string TitleEn, string TitleAr, string SlugEn, string SlugAr,
    string? ExcerptEn, string? ExcerptAr, string? ContentEn, string? ContentAr,
    string? CoverImageUrl, Guid AuthorId, DateTimeOffset? PublishedAt, bool IsPublished,
    string? SeoTitleEn, string? SeoTitleAr, string? SeoDescriptionEn, string? SeoDescriptionAr, string? AuthorName = null);

public interface IAdminArticleManager
{
    Task<IReadOnlyList<AdminAuthorContent>> GetAuthorsAsync(CancellationToken ct);
    Task<IReadOnlyList<AdminArticleContent>> GetArticlesAsync(CancellationToken ct);
    Task<AdminArticleContent?> SaveArticleAsync(Guid? id, SaveAdminArticle input, CancellationToken ct);
    Task<bool> DeleteArticleAsync(Guid id, CancellationToken ct);
}

public sealed class AdminArticleConflictException(string message) : Exception(message);

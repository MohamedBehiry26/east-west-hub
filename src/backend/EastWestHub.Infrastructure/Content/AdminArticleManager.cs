using Microsoft.EntityFrameworkCore;
using Npgsql;
using EastWestHub.Application.Content;
using EastWestHub.Domain.Entities;
using EastWestHub.Infrastructure.Persistence;

namespace EastWestHub.Infrastructure.Content;

public sealed class AdminArticleManager(EastWestHubDbContext db) : IAdminArticleManager
{
    public async Task<IReadOnlyList<AdminAuthorContent>> GetAuthorsAsync(CancellationToken ct) =>
        await db.ContentAuthors.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.DisplayName)
            .Select(x => new AdminAuthorContent(x.Id, x.DisplayName)).ToListAsync(ct);

    public async Task<IReadOnlyList<AdminArticleContent>> GetArticlesAsync(CancellationToken ct) =>
        await db.Articles.AsNoTracking().Include(x => x.Author)
            .OrderByDescending(x => x.PublishedAt).ThenBy(x => x.TitleEn)
            .Select(ToContent()).ToListAsync(ct);

    public async Task<AdminArticleContent?> SaveArticleAsync(Guid? id, SaveAdminArticle input, CancellationToken ct)
    {
        var authorId = input.AuthorId;
        if (input.AuthorName is not null)
        {
            var name = input.AuthorName.Trim();
            if (name.Length is < 1 or > 160)
                throw new AdminArticleConflictException("Enter an author name between 1 and 160 characters.");
            var author = await db.ContentAuthors.FirstOrDefaultAsync(x => x.DisplayName == name && x.IsActive, ct);
            if (author is null)
            {
                author = new User { Id = Guid.NewGuid(), DisplayName = name, Email = $"author-{Guid.NewGuid():N}@content.invalid" };
                db.ContentAuthors.Add(author);
            }
            authorId = author.Id;
        }
        else if (!await db.ContentAuthors.AnyAsync(x => x.Id == authorId && x.IsActive, ct))
            throw new AdminArticleConflictException("Select an active author.");

        var article = id is null
            ? new Article { TitleEn = input.TitleEn.Trim(), TitleAr = input.TitleAr.Trim(), SlugEn = input.SlugEn.Trim(), SlugAr = input.SlugAr.Trim(), AuthorId = authorId }
            : await db.Articles.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (article is null) return null;

        article.TitleEn = input.TitleEn.Trim(); article.TitleAr = input.TitleAr.Trim();
        article.SlugEn = input.SlugEn.Trim(); article.SlugAr = input.SlugAr.Trim();
        article.ExcerptEn = input.ExcerptEn; article.ExcerptAr = input.ExcerptAr;
        article.ContentEn = input.ContentEn; article.ContentAr = input.ContentAr;
        article.CoverImageUrl = input.CoverImageUrl; article.AuthorId = authorId;
        article.IsPublished = input.IsPublished;
        // PostgreSQL timestamptz accepts DateTimeOffset values in UTC. ToUniversalTime
        // preserves the instant supplied by the client while making it safe to persist.
        var publishedAt = input.PublishedAt?.ToUniversalTime();
        article.PublishedAt = input.IsPublished ? publishedAt ?? article.PublishedAt ?? DateTimeOffset.UtcNow : publishedAt;
        article.SeoTitleEn = input.SeoTitleEn; article.SeoTitleAr = input.SeoTitleAr;
        article.SeoDescriptionEn = input.SeoDescriptionEn; article.SeoDescriptionAr = input.SeoDescriptionAr;
        if (id is null) db.Articles.Add(article);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { throw new AdminArticleConflictException("An article already uses one of these slugs."); }

        return await db.Articles.AsNoTracking().Where(x => x.Id == article.Id).Select(ToContent()).SingleAsync(ct);
    }

    public async Task<bool> DeleteArticleAsync(Guid id, CancellationToken ct)
    {
        var article = await db.Articles.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (article is null) return false;
        db.Articles.Remove(article); await db.SaveChangesAsync(ct); return true;
    }

    private static System.Linq.Expressions.Expression<Func<Article, AdminArticleContent>> ToContent() =>
        x => new AdminArticleContent(x.Id, x.TitleEn, x.TitleAr, x.SlugEn, x.SlugAr,
            x.ExcerptEn, x.ExcerptAr, x.ContentEn, x.ContentAr, x.CoverImageUrl,
            x.AuthorId, x.Author.DisplayName, x.PublishedAt, x.IsPublished,
            x.SeoTitleEn, x.SeoTitleAr, x.SeoDescriptionEn, x.SeoDescriptionAr);
}

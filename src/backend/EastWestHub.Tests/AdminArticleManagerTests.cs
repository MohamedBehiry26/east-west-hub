using Microsoft.EntityFrameworkCore;
using EastWestHub.Application.Content;
using EastWestHub.Domain.Entities;
using EastWestHub.Infrastructure.Content;
using EastWestHub.Infrastructure.Persistence;
using Xunit;

namespace EastWestHub.Tests;

public sealed class AdminArticleManagerTests
{
    [Fact]
    public async Task Article_crud_keeps_bilingual_content_and_only_publishes_when_requested()
    {
        var options = new DbContextOptionsBuilder<EastWestHubDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new EastWestHubDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var author = new User { Id = Guid.NewGuid(), Email = "editor@example.test", DisplayName = "Content Editor" };
        db.ContentAuthors.Add(author); await db.SaveChangesAsync();
        var manager = new AdminArticleManager(db);
        var draft = Input(author.Id);

        var created = await manager.SaveArticleAsync(null, draft, CancellationToken.None);
        Assert.NotNull(created);
        Assert.False(created.IsPublished);
        Assert.Equal("مقدمة عربية", created.ExcerptAr);
        Assert.Empty((await new PublicContentReader(db).GetArticlesAsync(false, 1, 12, CancellationToken.None)).Items);

        var published = await manager.SaveArticleAsync(created.Id, draft with { IsPublished = true }, CancellationToken.None);
        Assert.True(published!.IsPublished);
        Assert.NotNull(published.PublishedAt);
        var publicArticle = Assert.Single((await new PublicContentReader(db).GetArticlesAsync(true, 1, 12, CancellationToken.None)).Items);
        Assert.Equal("ملخص حملة", publicArticle.Title);
        Assert.Equal("محتوى عربي كامل", publicArticle.Content);
        Assert.True(await manager.DeleteArticleAsync(created.Id, CancellationToken.None));
        Assert.Empty(await manager.GetArticlesAsync(CancellationToken.None));
    }

    [Fact]
    public async Task Scheduled_articles_are_not_public_until_their_publication_time()
    {
        var options = new DbContextOptionsBuilder<EastWestHubDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new EastWestHubDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var author = new User { Id = Guid.NewGuid(), Email = "editor@example.test", DisplayName = "Content Editor" };
        db.ContentAuthors.Add(author); await db.SaveChangesAsync();
        await new AdminArticleManager(db).SaveArticleAsync(null, Input(author.Id) with { IsPublished = true, PublishedAt = DateTimeOffset.UtcNow.AddDays(1) }, CancellationToken.None);

        Assert.Empty((await new PublicContentReader(db).GetArticlesAsync(false, 1, 12, CancellationToken.None)).Items);
    }

    [Fact]
    public async Task Article_create_normalizes_a_non_utc_publication_time_before_persistence()
    {
        await using var db = NewDb();
        var author = await AddActiveAuthorAsync(db);
        var inputTime = new DateTimeOffset(2026, 10, 8, 12, 30, 0, TimeSpan.FromHours(3));

        var created = await new AdminArticleManager(db).SaveArticleAsync(null,
            Input(author.Id) with { IsPublished = true, PublishedAt = inputTime }, CancellationToken.None);

        Assert.NotNull(created);
        Assert.Equal(inputTime.UtcDateTime, created.PublishedAt!.Value.UtcDateTime);
        Assert.Equal(TimeSpan.Zero, created.PublishedAt.Value.Offset);
        var stored = await db.Articles.SingleAsync(article => article.Id == created.Id);
        Assert.Equal(TimeSpan.Zero, stored.PublishedAt!.Value.Offset);
    }

    [Fact]
    public async Task Article_update_normalizes_a_non_utc_publication_time_before_persistence()
    {
        await using var db = NewDb();
        var author = await AddActiveAuthorAsync(db);
        var manager = new AdminArticleManager(db);
        var created = await manager.SaveArticleAsync(null, Input(author.Id), CancellationToken.None);
        var inputTime = new DateTimeOffset(2026, 10, 9, 9, 15, 0, TimeSpan.FromHours(3));

        var updated = await manager.SaveArticleAsync(created!.Id,
            Input(author.Id) with { IsPublished = true, PublishedAt = inputTime }, CancellationToken.None);

        Assert.NotNull(updated);
        Assert.Equal(inputTime.UtcDateTime, updated.PublishedAt!.Value.UtcDateTime);
        Assert.Equal(TimeSpan.Zero, updated.PublishedAt.Value.Offset);
    }

    [Fact]
    public async Task Draft_article_preserves_a_null_publication_time()
    {
        await using var db = NewDb();
        var author = await AddActiveAuthorAsync(db);

        var created = await new AdminArticleManager(db).SaveArticleAsync(null,
            Input(author.Id) with { IsPublished = false, PublishedAt = null }, CancellationToken.None);

        Assert.NotNull(created);
        Assert.False(created.IsPublished);
        Assert.Null(created.PublishedAt);
    }

    [Fact]
    public async Task Typed_author_names_are_saved_without_changing_other_articles()
    {
        await using var db = NewDb();
        var manager = new AdminArticleManager(db);
        var first = await manager.SaveArticleAsync(null, Input(Guid.Empty) with { AuthorName = "  كاتب أول  " }, CancellationToken.None);
        var second = await manager.SaveArticleAsync(null, Input(Guid.Empty) with { AuthorName = "كاتب أول", SlugEn = "second", SlugAr = "ثاني" }, CancellationToken.None);
        Assert.Equal("كاتب أول", first!.AuthorName);
        Assert.Equal(first.AuthorId, second!.AuthorId);
        var updated = await manager.SaveArticleAsync(first.Id, Input(Guid.Empty) with { AuthorName = "كاتبة أخرى", IsPublished = true }, CancellationToken.None);
        Assert.Equal("كاتبة أخرى", updated!.AuthorName);
        var unchanged = (await manager.GetArticlesAsync(CancellationToken.None)).Single(x => x.Id == second.Id);
        Assert.Equal("كاتب أول", unchanged.AuthorName);
        Assert.Equal("كاتبة أخرى", Assert.Single((await new PublicContentReader(db).GetArticlesAsync(true, 1, 12, CancellationToken.None)).Items).AuthorName);
        Assert.Empty(db.Users); // Content bylines never create login accounts.
    }

    [Fact]
    public async Task Blank_typed_author_is_rejected()
    {
        await using var db = NewDb();
        await Assert.ThrowsAsync<AdminArticleConflictException>(() => new AdminArticleManager(db)
            .SaveArticleAsync(null, Input(Guid.Empty) with { AuthorName = "   " }, CancellationToken.None));
    }
    private static EastWestHubDbContext NewDb() => new(new DbContextOptionsBuilder<EastWestHubDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task<User> AddActiveAuthorAsync(EastWestHubDbContext db)
    {
        var author = new User { Id = Guid.NewGuid(), Email = "editor@example.test", DisplayName = "Content Editor" };
        db.ContentAuthors.Add(author);
        await db.SaveChangesAsync();
        return author;
    }

    private static SaveAdminArticle Input(Guid authorId) => new(
        "Campaign Recap", "ملخص حملة", "campaign-recap", "mulakhas-hamla",
        "English intro", "مقدمة عربية", "Full English content", "محتوى عربي كامل",
        "https://example.test/cover.webp", authorId, null, false,
        "Campaign Recap SEO", "عنوان تحسين البحث", "SEO summary", "وصف تحسين البحث");
}

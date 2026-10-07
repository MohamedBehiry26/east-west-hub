using Microsoft.EntityFrameworkCore;
using SpaceMedia.Application.Content;
using SpaceMedia.Domain.Entities;
using SpaceMedia.Infrastructure.Content;
using SpaceMedia.Infrastructure.Persistence;
using Xunit;

namespace SpaceMedia.Tests;

public sealed class AdminArticleManagerTests
{
    [Fact]
    public async Task Article_crud_keeps_bilingual_content_and_only_publishes_when_requested()
    {
        var options = new DbContextOptionsBuilder<SpaceMediaDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new SpaceMediaDbContext(options);
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
        var options = new DbContextOptionsBuilder<SpaceMediaDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new SpaceMediaDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var author = new User { Id = Guid.NewGuid(), Email = "editor@example.test", DisplayName = "Content Editor" };
        db.ContentAuthors.Add(author); await db.SaveChangesAsync();
        await new AdminArticleManager(db).SaveArticleAsync(null, Input(author.Id) with { IsPublished = true, PublishedAt = DateTimeOffset.UtcNow.AddDays(1) }, CancellationToken.None);

        Assert.Empty((await new PublicContentReader(db).GetArticlesAsync(false, 1, 12, CancellationToken.None)).Items);
    }

    private static SaveAdminArticle Input(Guid authorId) => new(
        "Campaign Recap", "ملخص حملة", "campaign-recap", "mulakhas-hamla",
        "English intro", "مقدمة عربية", "Full English content", "محتوى عربي كامل",
        "https://example.test/cover.webp", authorId, null, false,
        "Campaign Recap SEO", "عنوان تحسين البحث", "SEO summary", "وصف تحسين البحث");
}

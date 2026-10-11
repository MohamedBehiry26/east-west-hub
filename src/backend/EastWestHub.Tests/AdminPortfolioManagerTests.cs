using Microsoft.EntityFrameworkCore;
using EastWestHub.Application.Content;
using EastWestHub.Infrastructure.Content;
using EastWestHub.Infrastructure.Persistence;
using Xunit;

namespace EastWestHub.Tests;

public sealed class AdminPortfolioManagerTests
{
    [Fact]
    public async Task Service_can_be_created_updated_listed_and_deleted()
    {
        var options = new DbContextOptionsBuilder<EastWestHubDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new EastWestHubDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var manager = new AdminPortfolioManager(db);
        var draft = Service("Cinematic Production", "إنتاج سينمائي", "cinematic-production", "intaj-sinimائي");

        var created = await manager.SaveServiceAsync(null, draft, CancellationToken.None);
        Assert.NotNull(created);
        Assert.Equal("إنتاج سينمائي", created.TitleAr);
        Assert.Single(await manager.GetServicesAsync(CancellationToken.None));

        var updated = await manager.SaveServiceAsync(created.Id, draft with { IsPublished = true, DisplayOrder = 4 }, CancellationToken.None);
        Assert.True(updated!.IsPublished);
        Assert.Equal(4, updated.DisplayOrder);
        Assert.True(await manager.DeleteServiceAsync(created.Id, CancellationToken.None));
        Assert.Empty(await manager.GetServicesAsync(CancellationToken.None));
    }

    [Fact]
    public async Task Portfolio_crud_replaces_gallery_and_preserves_bilingual_alt_text()
    {
        var options = new DbContextOptionsBuilder<EastWestHubDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new EastWestHubDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var manager = new AdminPortfolioManager(db);
        var service = await manager.SaveServiceAsync(null, Service("Video production", "إنتاج الفيديو", "video-production", "intaj-video") with { IsPublished = true }, CancellationToken.None);
        var input = Project("mars-campaign", "حملة المريخ") with
        {
            CategoryEn = "Campaigns", CategoryAr = "حملات",
            ApproachEn = "We shaped the story around exploration.", ApproachAr = "صغنا الحكاية حول الاستكشاف.",
            Images = [new SaveAdminPortfolioImage("https://example.test/one.webp", "Red planet", "الكوكب الأحمر", 0)],
            ServiceIds = [service!.Id],
            IsPublished = true
        };

        var created = await manager.SavePortfolioAsync(null, input, CancellationToken.None);
        Assert.NotNull(created);
        Assert.Equal("الكوكب الأحمر", Assert.Single(created.Images).AltTextAr);
        Assert.Equal("Campaigns", created.CategoryEn);
        Assert.Equal("حملات", created.CategoryAr);
        Assert.Equal("We shaped the story around exploration.", created.ApproachEn);
        Assert.Equal(service.Id, Assert.Single(created.ServiceIds));

        var reader = new PublicContentReader(db);
        var publicService = Assert.Single((await reader.GetServicesAsync(false, 1, 12, CancellationToken.None)).Items);
        Assert.Equal("Campaign Project", Assert.Single(publicService.RelatedProjects).Title);
        var publicProject = Assert.Single((await reader.GetPortfolioAsync(true, 1, 12, CancellationToken.None)).Items);
        Assert.Equal("حملات", publicProject.Category);
        Assert.Equal("صغنا الحكاية حول الاستكشاف.", publicProject.Approach);
        Assert.Equal("إنتاج الفيديو", Assert.Single(publicProject.ServicesUsed));

        var updated = await manager.SavePortfolioAsync(created.Id, input with { DisplayOrder = 3, Images = [], ServiceIds = [] }, CancellationToken.None);
        Assert.Equal(3, updated!.DisplayOrder);
        Assert.Empty(updated.Images);
        Assert.True(await manager.DeletePortfolioAsync(created.Id, CancellationToken.None));
        Assert.Empty(await manager.GetPortfolioAsync(CancellationToken.None));
    }

    private static SaveAdminService Service(string titleEn, string titleAr, string slugEn, string slugAr) =>
        new(titleEn, titleAr, slugEn, slugAr, "Short English", "وصف مختصر", "Overview", "نبذة", "Video production and creative strategy", "إنتاج الفيديو والاستراتيجية الإبداعية", "Research\nProduction", "بحث\nإنتاج", null, 1, false, "SEO", "تحسين البحث", "Description", "وصف");

    private static SaveAdminPortfolio Project(string slugEn, string slugAr) =>
        new("Campaign Project", "مشروع حملة", slugEn, slugAr, "Creative", "Campaigns", "حملات", "Campaign overview", "تفاصيل الحملة", "A production challenge", "تحدٍ", "An approach", "نهج", "A solution", "حل", "Strong results", "نتائج", "https://example.test/cover.webp", new DateOnly(2026, 1, 1), 1, true, false, "SEO", "تحسين البحث", "Description", "وصف", [], []);
}

using Microsoft.EntityFrameworkCore;
using SpaceMedia.Application.Content;
using SpaceMedia.Infrastructure.Content;
using SpaceMedia.Infrastructure.Persistence;
using Xunit;

namespace SpaceMedia.Tests;

public sealed class AdminSiteSettingsManagerTests
{
    [Fact]
    public async Task Settings_can_be_updated_and_public_contact_data_reflects_saved_values()
    {
        var options = new DbContextOptionsBuilder<SpaceMediaDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new SpaceMediaDbContext(options);
        await db.Database.EnsureCreatedAsync();
        db.SiteSettings.Add(new() { Id = 1, AgencyNameEn = "Old Name", AgencyNameAr = "اسم قديم" });
        await db.SaveChangesAsync();
        var manager = new AdminSiteSettingsManager(db);
        var saved = await manager.SaveAsync(new("East West Hub", "إيست ويست هب", "A media and creative platform", "منصة إعلامية وإبداعية",
            "https://example.test/logo.webp", "https://example.test/favicon.ico", "hello@example.test", "+201000000000",
            "Cairo", "القاهرة", "UCExampleChannel", "East West Hub | Creative Studio", "إيست ويست هب | استوديو إبداعي",
            "Media content and creative production.", "إنتاج المحتوى والإبداع الإعلامي.",
            [new("Instagram", "https://instagram.com/eastwesthub-demo", 1, true)]), CancellationToken.None);

        Assert.Equal("إيست ويست هب", saved.AgencyNameAr);
        Assert.Single(saved.SocialLinks);
        Assert.Equal("UCExampleChannel", saved.YouTubeChannelId);
        Assert.Equal("East West Hub | Creative Studio", saved.DefaultSeoTitleEn);
        var publicArabic = await new PublicContentReader(db).GetSiteSettingsAsync(true, CancellationToken.None);
        Assert.Equal("إيست ويست هب", publicArabic!.AgencyName);
        Assert.Equal("القاهرة", publicArabic.Address);
        Assert.Equal("https://instagram.com/eastwesthub-demo", Assert.Single(publicArabic.SocialLinks).Url);
    }
}

using Microsoft.EntityFrameworkCore;
using SpaceMedia.Application.Content;
using SpaceMedia.Infrastructure.Content;
using SpaceMedia.Infrastructure.Persistence;
using Xunit;

namespace SpaceMedia.Tests;

public sealed class AdminSiteSettingsManagerTests
{
    [Fact]
    public async Task Repeated_social_save_preserves_link_identity_and_rejects_duplicates_before_mutation()
    {
        await using var db=new SpaceMediaDbContext(new DbContextOptionsBuilder<SpaceMediaDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var manager=new AdminSiteSettingsManager(db);
        var input=new SaveAdminSiteSettings("Hub","هب",null,null,null,null,null,null,null,null,null,null,null,null,[new("YouTube","https://youtube.com/@example",0,true)]);
        await manager.SaveAsync(input,CancellationToken.None);var id=(await db.SocialLinks.SingleAsync()).Id;
        await manager.SaveAsync(input with {SocialLinks=[new("YouTube","https://youtube.com/@updated",0,true)]},CancellationToken.None);
        Assert.Equal(id,(await db.SocialLinks.SingleAsync()).Id);
        await Assert.ThrowsAsync<VideoAdministrationConflictException>(()=>manager.SaveAsync(input with {AgencyNameEn="Changed",SocialLinks=[new("YouTube","https://youtube.com/@a",0,true),new(" youtube ","https://youtube.com/@b",1,true)]},CancellationToken.None));
        Assert.Equal("Hub",(await manager.GetAsync(CancellationToken.None))!.AgencyNameEn);
    }
    [Fact]
    public async Task Hero_link_is_normalized_exposed_publicly_and_can_be_cleared()
    {
        await using var db = new SpaceMediaDbContext(new DbContextOptionsBuilder<SpaceMediaDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var manager = new AdminSiteSettingsManager(db);
        var input = new SaveAdminSiteSettings("Hub", "هب", null, null, null, null, null, null, null, null, null, null, null, null, [], "https://youtu.be/M7lc1UVf-VE");
        var saved = await manager.SaveAsync(input, CancellationToken.None);
        Assert.Equal("https://www.youtube.com/watch?v=M7lc1UVf-VE", saved.HeroVideoUrl);
        Assert.Equal("M7lc1UVf-VE", (await new PublicContentReader(db).GetSiteSettingsAsync(true, CancellationToken.None))!.HeroYouTubeVideoId);
        await Assert.ThrowsAsync<VideoAdministrationConflictException>(() => manager.SaveAsync(input with { HeroVideoUrl = "https://example.test/video" }, CancellationToken.None));
        Assert.Equal("M7lc1UVf-VE", (await new PublicContentReader(db).GetSiteSettingsAsync(false, CancellationToken.None))!.HeroYouTubeVideoId);
        await manager.SaveAsync(input with { HeroVideoUrl = "" }, CancellationToken.None);
        Assert.Null((await manager.GetAsync(CancellationToken.None))!.HeroVideoUrl);
    }
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
            "Cairo", "القاهرة", "East West Hub | Creative Studio", "إيست ويست هب | استوديو إبداعي",
            "Media content and creative production.", "إنتاج المحتوى والإبداع الإعلامي.",
            [new("Instagram", "https://instagram.com/eastwesthub-demo", 1, true)]), CancellationToken.None);

        Assert.Equal("إيست ويست هب", saved.AgencyNameAr);
        Assert.Single(saved.SocialLinks);
        Assert.Equal("East West Hub | Creative Studio", saved.DefaultSeoTitleEn);
        var publicArabic = await new PublicContentReader(db).GetSiteSettingsAsync(true, CancellationToken.None);
        Assert.Equal("إيست ويست هب", publicArabic!.AgencyName);
        Assert.Equal("القاهرة", publicArabic.Address);
        Assert.Equal("https://instagram.com/eastwesthub-demo", Assert.Single(publicArabic.SocialLinks).Url);
    }
}

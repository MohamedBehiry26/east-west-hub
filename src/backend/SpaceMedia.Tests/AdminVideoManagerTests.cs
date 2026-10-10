using Microsoft.EntityFrameworkCore;
using SpaceMedia.Application.Content;
using SpaceMedia.Domain.Entities;
using SpaceMedia.Infrastructure.Content;
using SpaceMedia.Infrastructure.Persistence;
using Xunit;

namespace SpaceMedia.Tests;

public sealed class AdminVideoManagerTests
{
    [Theory]
    [InlineData("https://www.youtube.com/watch?v=M7lc1UVf-VE", "M7lc1UVf-VE")]
    [InlineData("https://youtu.be/M7lc1UVf-VE", "M7lc1UVf-VE")]
    [InlineData("https://www.youtube.com/shorts/M7lc1UVf-VE", "M7lc1UVf-VE")]
    [InlineData("https://www.youtube.com/embed/M7lc1UVf-VE", "M7lc1UVf-VE")]
    public void Extracts_supported_YouTube_links(string url, string expected) => Assert.Equal(expected, AdminVideoManager.ExtractYouTubeVideoId(url));

    [Theory]
    [InlineData("https://example.com/watch?v=M7lc1UVf-VE")]
    [InlineData("https://youtube.com/watch?v=bad")]
    [InlineData("not-a-url")]
    public void Rejects_invalid_YouTube_links(string url) => Assert.Throws<VideoAdministrationConflictException>(() => AdminVideoManager.ExtractYouTubeVideoId(url));

    [Fact]
    public async Task Creates_updates_and_prevents_duplicate_manual_videos()
    {
        await using var db = NewDb(); var category = new Category { NameEn="Media", NameAr="إعلام", SlugEn="media", SlugAr="media", IsPublished=true }; db.Categories.Add(category); await db.SaveChangesAsync();
        var manager = new AdminVideoManager(db); var input = Input(category.Id, "https://youtu.be/M7lc1UVf-VE", true);
        var created = await manager.SaveVideoAsync(null, input, CancellationToken.None);
        Assert.NotNull(created); Assert.Equal("M7lc1UVf-VE", created.YouTubeVideoId); Assert.True(created.IsPublished);
        var duplicate = await Assert.ThrowsAsync<VideoAdministrationConflictException>(() => manager.SaveVideoAsync(null, input with { SlugEn="other", SlugAr="other" }, CancellationToken.None)); Assert.Contains("already", duplicate.Message, StringComparison.OrdinalIgnoreCase);
        var updated = await manager.SaveVideoAsync(created.Id, input with { TitleEn="Updated title", YouTubeUrl="https://www.youtube.com/embed/M7lc1UVf-VE", IsPublished=false }, CancellationToken.None);
        Assert.Equal("Updated title", updated!.TitleEn); Assert.False(updated.IsPublished);
        Assert.True(await manager.DeleteVideoAsync(created.Id, CancellationToken.None)); Assert.Empty(await manager.GetVideosAsync(CancellationToken.None));
    }

    [Fact]
    public async Task Existing_videos_remain_editable_with_normalized_manual_url()
    {
        await using var db = NewDb(); var category = new Category { NameEn="Media", NameAr="إعلام", SlugEn="media", SlugAr="media", IsPublished=true }; var video = new Video { Id=Guid.NewGuid(), YouTubeVideoId="M7lc1UVf-VE", TitleEn="Existing", TitleAr="قائم", SlugEn="existing", SlugAr="existing", Category=category, IsPublished=true }; db.AddRange(category, video); await db.SaveChangesAsync();
        var saved = await new AdminVideoManager(db).SaveVideoAsync(video.Id, Input(category.Id, "https://youtu.be/M7lc1UVf-VE", true) with { TitleEn="Edited", SlugEn="edited", SlugAr="edited" }, CancellationToken.None);
        Assert.Equal("Edited", saved!.TitleEn); Assert.Equal("M7lc1UVf-VE", saved.YouTubeVideoId);
    }

    [Fact]
    public async Task Editing_preserves_podcast_metadata_tags_and_unrelated_source_fields()
    {
        await using var db = NewDb();
        var category = new Category { NameEn="Media", NameAr="إعلام", SlugEn="media", SlugAr="media" };
        db.Categories.Add(category); await db.SaveChangesAsync();
        var manager = new AdminVideoManager(db);
        var input = Input(category.Id, "https://youtu.be/M7lc1UVf-VE", true) with {
            ContentType=MediaContentType.Podcast, EpisodeNumber=4, SeasonNumber=2,
            GuestNameEn="Guest", GuestNameAr="ضيف", SeoTitleEn="SEO", SeoTitleAr="عنوان",
            SeoDescriptionEn="Description", SeoDescriptionAr="وصف", Tags=[new("Media","إعلام")]
        };
        var created = (await manager.SaveVideoAsync(null, input, CancellationToken.None))!;
        var entity = await db.Videos.SingleAsync();
        entity.PublishedAt=DateTimeOffset.UtcNow.AddDays(-1); entity.Duration=TimeSpan.FromMinutes(10);
        entity.YouTubeThumbnailUrl="https://example.test/source.jpg"; entity.YouTubeTitle="Source title"; entity.YouTubeDescription="Source description";
        await db.SaveChangesAsync(); var publishedAt=entity.PublishedAt;
        var updated = (await manager.SaveVideoAsync(created.Id, input with {TitleEn="Edited"}, CancellationToken.None))!;
        Assert.Equal(4,updated.EpisodeNumber); Assert.Equal(2,updated.SeasonNumber);
        Assert.Equal("Guest",updated.GuestNameEn); Assert.Equal("ضيف",updated.GuestNameAr);
        Assert.Equal("SEO",updated.SeoTitleEn); Assert.Equal("عنوان",updated.SeoTitleAr);
        Assert.Equal("Description",updated.SeoDescriptionEn); Assert.Equal("وصف",updated.SeoDescriptionAr);
        Assert.Single(updated.Tags); Assert.Single(await db.VideoTags.ToListAsync());
        Assert.Equal(publishedAt,updated.PublishedAt); Assert.Equal(TimeSpan.FromMinutes(10),updated.Duration);
        Assert.Null(updated.ThumbnailUrl); Assert.Null(entity.ThumbnailUrl);
        Assert.Equal("https://example.test/source.jpg",entity.YouTubeThumbnailUrl);
        Assert.Equal("Source title",entity.YouTubeTitle); Assert.Equal("Source description",entity.YouTubeDescription);
    }

    [Fact]
    public async Task Existing_poster_only_records_can_be_edited_without_a_link_or_deleting_other_media()
    {
        await using var db=NewDb();
        var category=new Category {NameEn="Media",NameAr="إعلام",SlugEn="media",SlugAr="media"};
        var poster=new Video {TitleEn="Poster",TitleAr="صورة",SlugEn="poster",SlugAr="poster",Category=category,ThumbnailUrl="https://example.test/poster.jpg"};
        var other=new Video {TitleEn="Other",TitleAr="آخر",SlugEn="other",SlugAr="other",Category=category};
        db.AddRange(category,poster,other);await db.SaveChangesAsync();
        var manager=new AdminVideoManager(db);
        var updated=await manager.SaveVideoAsync(poster.Id,Input(category.Id,"",false) with {ThumbnailUrl=poster.ThumbnailUrl},CancellationToken.None);
        Assert.Null(updated!.YouTubeVideoId);Assert.Equal(poster.ThumbnailUrl,updated.ThumbnailUrl);
        Assert.Equal(2,await db.Videos.CountAsync());Assert.Equal("Other",other.TitleEn);
        await Assert.ThrowsAsync<VideoAdministrationConflictException>(()=>manager.SaveVideoAsync(null,Input(category.Id,"",false),CancellationToken.None));
    }

    [Fact]
    public async Task Empty_update_link_retains_existing_YouTube_id()
    {
        await using var db=NewDb();var category=new Category {NameEn="Media",NameAr="إعلام",SlugEn="media",SlugAr="media"};
        db.Categories.Add(category);await db.SaveChangesAsync();var manager=new AdminVideoManager(db);
        var input=Input(category.Id,"https://youtu.be/M7lc1UVf-VE",true);
        var created=(await manager.SaveVideoAsync(null,input,CancellationToken.None))!;
        Assert.Equal(created.YouTubeVideoId,(await manager.SaveVideoAsync(created.Id,input with {YouTubeUrl=null},CancellationToken.None))!.YouTubeVideoId);
    }

    private static SaveAdminVideo Input(Guid categoryId, string url, bool published) => new(url, "Manual video", "فيديو يدوي", "manual-video", "manual-video-ar", "English", "عربي", null, categoryId, false, published, 0, []);
    private static SpaceMediaDbContext NewDb() => new(new DbContextOptionsBuilder<SpaceMediaDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
}

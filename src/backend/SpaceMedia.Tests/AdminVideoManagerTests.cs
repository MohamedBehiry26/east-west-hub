using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SpaceMedia.Application.Content;
using SpaceMedia.Domain.Entities;
using SpaceMedia.Infrastructure.Content;
using SpaceMedia.Infrastructure.Persistence;
using Xunit;

namespace SpaceMedia.Tests;

public sealed class AdminVideoManagerTests
{
    [Fact]
    public async Task YouTube_adapter_reads_public_uploads_and_video_metadata()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["YouTube:ApiKey"] = "test-key",
            ["YouTube:ChannelId"] = "test-channel"
        }).Build();
        using var client = new HttpClient(new YouTubeResponseHandler());
        var service = new YouTubeService(client, configuration);

        var video = Assert.Single(await service.GetUploadsAsync(CancellationToken.None));
        Assert.Equal("Abc12345678", video.VideoId);
        Assert.Equal("Creative interview", video.Title);
        Assert.Equal("https://example.test/thumb.webp", video.ThumbnailUrl);
        Assert.Equal(TimeSpan.FromMinutes(2), video.Duration);
        Assert.Equal("media", Assert.Single(video.Tags));
    }

    [Fact]
    public async Task Categories_support_bilingual_crud_and_reject_deletion_when_videos_use_them()
    {
        await using var db = NewDb();
        var manager = new AdminVideoManager(db, new FakeYouTubeService([]));
        var input = new SaveAdminCategory("Media", "إعلام", "media", "ielam", "Media production", "إنتاج إعلامي", null, 2, true);

        var created = await manager.SaveCategoryAsync(null, input, CancellationToken.None);
        Assert.NotNull(created);
        Assert.Equal("إعلام", created.NameAr);
        Assert.Equal("ielam", created.SlugAr);

        var updated = await manager.SaveCategoryAsync(created.Id, input with { NameEn = "Content Production", NameAr = "إنتاج محتوى", DisplayOrder = 1 }, CancellationToken.None);
        Assert.Equal("Content Production", updated!.NameEn);
        Assert.Equal("إنتاج محتوى", updated.NameAr);
        Assert.Equal(1, updated.DisplayOrder);

        var invalidId = Guid.NewGuid();
        Assert.Null(await manager.SaveCategoryAsync(invalidId, input, CancellationToken.None));
        Assert.False(await manager.DeleteCategoryAsync(invalidId, CancellationToken.None));

        db.Videos.Add(new Video
        {
            Id = Guid.NewGuid(), YouTubeVideoId = "Abc12345678", TitleEn = "Interview", TitleAr = "حوار",
            SlugEn = "interview", SlugAr = "hiwar", CategoryId = created.Id, IsPublished = false
        });
        await db.SaveChangesAsync();
        await Assert.ThrowsAsync<VideoAdministrationConflictException>(() => manager.DeleteCategoryAsync(created.Id, CancellationToken.None));
    }

    [Fact]
    public async Task YouTube_adapter_fails_safely_when_credentials_are_missing()
    {
        var service = new YouTubeService(new HttpClient(new YouTubeResponseHandler()), new ConfigurationBuilder().Build());
        await Assert.ThrowsAsync<YouTubeNotConfiguredException>(() => service.GetUploadsAsync(CancellationToken.None));
    }

    [Fact]
    public async Task YouTube_adapter_surfaces_upstream_failure_without_returning_content()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["YouTube:ApiKey"] = "test-key",
            ["YouTube:ChannelId"] = "test-channel"
        }).Build();
        var service = new YouTubeService(new HttpClient(new FailingYouTubeResponseHandler()), configuration);

        var error = await Assert.ThrowsAsync<HttpRequestException>(() => service.GetUploadsAsync(CancellationToken.None));

        Assert.Equal(System.Net.HttpStatusCode.ServiceUnavailable, error.StatusCode);
        Assert.DoesNotContain("test-key", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task YouTube_sync_is_idempotent_and_preserves_website_managed_fields()
    {
        await using var db = NewDb();
        var category = new Category { NameEn = "Media", NameAr = "إعلام", SlugEn = "media", SlugAr = "ielam", IsPublished = true };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        var youtube = new FakeYouTubeService([new YouTubeVideoMetadata("Abc12345678", "YouTube title", "Imported description", "https://example.test/one.webp", DateTimeOffset.UtcNow, TimeSpan.FromMinutes(2), ["media", "media"])]);
        var manager = new AdminVideoManager(db, youtube);

        var first = await manager.SyncYouTubeAsync(category.Id, CancellationToken.None);
        var imported = Assert.Single(await manager.GetVideosAsync(CancellationToken.None));
        Assert.Equal(1, first.Added);
        Assert.False(imported.IsPublished);
        Assert.Equal(2, imported.Tags.Count);

        var edited = await manager.SaveVideoAsync(imported.Id, new SaveAdminVideo(
            "Edited title", "عنوان محرر", "edited-title", "unwan-muharrar", "Editorial copy", "محتوى تحريري", "https://example.test/editorial.webp",
            category.Id, true, true, 8, [new AdminVideoTagInput("Studio", "الاستوديو")]), CancellationToken.None);
        Assert.NotNull(edited);

        youtube.Items = [new YouTubeVideoMetadata("Abc12345678", "Changed YouTube title", "Changed description", "https://example.test/two.webp", DateTimeOffset.UtcNow.AddDays(1), TimeSpan.FromMinutes(3), ["different"] )];
        var second = await manager.SyncYouTubeAsync(category.Id, CancellationToken.None);
        var afterSync = Assert.Single(await manager.GetVideosAsync(CancellationToken.None));

        Assert.Equal(0, second.Added);
        Assert.Equal(1, second.Updated);
        Assert.Equal("Edited title", afterSync.TitleEn);
        Assert.Equal("عنوان محرر", afterSync.TitleAr);
        Assert.Equal("https://example.test/editorial.webp", afterSync.ThumbnailUrl);
        var sourceMetadata = await db.Videos.AsNoTracking().SingleAsync();
        Assert.Equal("Changed YouTube title", sourceMetadata.YouTubeTitle);
        Assert.Equal("Changed description", sourceMetadata.YouTubeDescription);
        Assert.Equal("https://example.test/two.webp", sourceMetadata.YouTubeThumbnailUrl);
        Assert.True(afterSync.IsFeatured);
        Assert.True(afterSync.IsPublished);
        Assert.Equal(8, afterSync.DisplayOrder);
        Assert.Equal("Studio", Assert.Single(afterSync.Tags).NameEn);
    }

    [Fact]
    public async Task Podcast_classification_and_editorial_metadata_survive_youtube_sync()
    {
        await using var db = NewDb();
        var category = new Category { NameEn = "Podcasts", NameAr = "بودكاست", SlugEn = "podcasts", SlugAr = "podcast", IsPublished = true };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        var youtube = new FakeYouTubeService([new YouTubeVideoMetadata("Abc12345678", "Original upload", "Source copy", null, DateTimeOffset.UtcNow, null, [])]);
        var manager = new AdminVideoManager(db, youtube);
        await manager.SyncYouTubeAsync(category.Id, CancellationToken.None);
        var imported = Assert.Single(await manager.GetVideosAsync(CancellationToken.None));
        var saved = await manager.SaveVideoAsync(imported.Id, new SaveAdminVideo(
            "Episode 01", "الحلقة 01", "episode-01", "al-halaqa-01", "Show notes", "ملاحظات الحلقة", null,
            category.Id, true, true, 1, [], MediaContentType.Podcast, 1, 2, "Demo Guest", "ضيف تجريبي", "Episode 01", "الحلقة 01", null, null), CancellationToken.None);

        Assert.NotNull(saved);
        Assert.Equal(MediaContentType.Podcast, saved.ContentType);
        Assert.Equal(1, saved.EpisodeNumber);
        Assert.Equal(2, saved.SeasonNumber);
        Assert.Equal("Demo Guest", saved.GuestNameEn);

        await manager.SyncYouTubeAsync(category.Id, CancellationToken.None);
        var afterSync = Assert.Single(await manager.GetVideosAsync(CancellationToken.None));
        Assert.Equal(MediaContentType.Podcast, afterSync.ContentType);
        Assert.Equal("Episode 01", afterSync.TitleEn);
        Assert.Equal("Demo Guest", afterSync.GuestNameEn);
    }

    [Theory]
    [InlineData(MediaContentType.Video)]
    [InlineData(MediaContentType.Podcast)]
    [InlineData(MediaContentType.Program)]
    [InlineData(MediaContentType.Interview)]
    [InlineData(MediaContentType.Campaign)]
    [InlineData(MediaContentType.Documentary)]
    [InlineData(MediaContentType.OriginalContent)]
    [InlineData(MediaContentType.Event)]
    [InlineData(MediaContentType.BrandedContent)]
    [InlineData(MediaContentType.Other)]
    public async Task Admin_accepts_each_supported_media_classification(MediaContentType contentType)
    {
        await using var db = NewDb();
        var category = new Category { NameEn = "Media", NameAr = "إعلام", SlugEn = "media", SlugAr = "ielam", IsPublished = true };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        var manager = new AdminVideoManager(db, new FakeYouTubeService([
            new YouTubeVideoMetadata("Abc12345678", "Original upload", "Source copy", null, DateTimeOffset.UtcNow, null, [])
        ]));
        await manager.SyncYouTubeAsync(category.Id, CancellationToken.None);
        var imported = Assert.Single(await manager.GetVideosAsync(CancellationToken.None));
        var isPodcast = contentType == MediaContentType.Podcast;

        var saved = await manager.SaveVideoAsync(imported.Id, new SaveAdminVideo(
            "Editorial title", "عنوان تحريري", "editorial-title", "unwan-tahriri", "Editorial description", "وصف تحريري", null,
            category.Id, true, false, 1, [], contentType,
            isPodcast ? 1 : null, isPodcast ? 1 : null,
            isPodcast ? "Demo Guest" : null, isPodcast ? "ضيف تجريبي" : null,
            null, null, null, null), CancellationToken.None);

        Assert.NotNull(saved);
        Assert.Equal(contentType, saved.ContentType);
        Assert.Equal(isPodcast ? 1 : null, saved.EpisodeNumber);
        Assert.Equal(isPodcast ? 1 : null, saved.SeasonNumber);
        Assert.Equal(isPodcast ? "Demo Guest" : null, saved.GuestNameEn);
    }

    [Fact]
    public async Task Admin_rejects_media_classification_values_outside_the_supported_enum()
    {
        await using var db = NewDb();
        var category = new Category { NameEn = "Media", NameAr = "إعلام", SlugEn = "media", SlugAr = "ielam", IsPublished = true };
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        var manager = new AdminVideoManager(db, new FakeYouTubeService([]));
        var input = new SaveAdminVideo(
            "Title", "عنوان", "title", "unwan", "Description", "وصف", null,
            category.Id, false, false, 0, [], (MediaContentType)999);

        await Assert.ThrowsAsync<VideoAdministrationConflictException>(
            () => manager.SaveVideoAsync(Guid.NewGuid(), input, CancellationToken.None));
    }

    [Fact]
    public async Task Public_video_filters_search_tags_categories_and_featured_state()
    {
        await using var db = NewDb();
        var category = new Category { NameEn = "Media", NameAr = "إعلام", SlugEn = "media", SlugAr = "ielam", IsPublished = true };
        var tag = new Tag { NameEn = "Interviews", NameAr = "حوارات", SlugEn = "interviews", SlugAr = "hiwarat" };
        var video = new Video { YouTubeVideoId = "XyZ12345678", TitleEn = "A creative story", TitleAr = "قصة إبداعية", SlugEn = "creative-story", SlugAr = "qissa-ibdaiya", Category = category, IsPublished = true, IsFeatured = true, VideoTags = [new VideoTag { Tag = tag }] };
        db.Videos.Add(video);
        await db.SaveChangesAsync();

        var page = await new PublicContentReader(db).GetVideosAsync(false, 1, 9, "media", "creative", "interviews", true, "latest", CancellationToken.None);
        Assert.Equal(1, page.TotalCount);
        Assert.Equal("A creative story", Assert.Single(page.Items).Title);
        Assert.Equal("Interviews", Assert.Single(page.Items[0].Tags));
        Assert.Equal("interviews", Assert.Single(await new PublicContentReader(db).GetTagsAsync(false, CancellationToken.None)).Slug);
    }

    private static SpaceMediaDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<SpaceMediaDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        return new SpaceMediaDbContext(options);
    }

    private sealed class FakeYouTubeService(IReadOnlyList<YouTubeVideoMetadata> items) : IYouTubeService
    {
        public IReadOnlyList<YouTubeVideoMetadata> Items { get; set; } = items;
        public Task<IReadOnlyList<YouTubeVideoMetadata>> GetUploadsAsync(CancellationToken cancellationToken, string? channelId = null) => Task.FromResult(Items);
    }

    private sealed class YouTubeResponseHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var path = request.RequestUri!.AbsolutePath;
            var json = path.EndsWith("/channels", StringComparison.Ordinal)
                ? """{"items":[{"contentDetails":{"relatedPlaylists":{"uploads":"uploads-playlist"}}}]}"""
                : path.EndsWith("/playlistItems", StringComparison.Ordinal)
                    ? """{"items":[{"contentDetails":{"videoId":"Abc12345678"}}]}"""
                    : """{"items":[{"id":"Abc12345678","snippet":{"title":"Creative interview","description":"A creative conversation","publishedAt":"2026-01-02T03:04:05Z","thumbnails":{"high":{"url":"https://example.test/thumb.webp"}},"tags":["media"]},"contentDetails":{"duration":"PT2M"},"status":{"privacyStatus":"public"}}]}""";
            return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = new StringContent(json) });
        }
    }

    private sealed class FailingYouTubeResponseHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.ServiceUnavailable));
    }
}

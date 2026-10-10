using System.ComponentModel.DataAnnotations;
using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SpaceMedia.Api.Contracts;
using SpaceMedia.Api.Controllers;
using SpaceMedia.Application.Content;
using SpaceMedia.Domain.Entities;
using SpaceMedia.Infrastructure.Content;
using SpaceMedia.Infrastructure.Persistence;
using Xunit;

namespace SpaceMedia.Tests;

public sealed class PublicApiQaTests
{
    [Fact]
    public async Task Public_video_api_localizes_search_and_paginates_results()
    {
        await using var db = NewDb();
        var category = new Category
        {
            Id = Guid.NewGuid(), NameEn = "Media", NameAr = "إعلام",
            SlugEn = "media", SlugAr = "ielam", IsPublished = true
        };
        db.Categories.Add(category);
        db.Videos.AddRange(
            Video(category, "english-one", "arabic-one", "Creative story", "قصة إبداعية", DateTimeOffset.UtcNow.AddDays(-2)),
            Video(category, "english-two", "arabic-two", "Second media story", "قصة إعلامية ثانية", DateTimeOffset.UtcNow.AddDays(-1)));
        await db.SaveChangesAsync();
        var controller = NewController(db);

        var response = await controller.GetVideos("ar", page: 1, pageSize: 1, category: "ielam", search: "قصة", order: "latest");

        var page = Assert.IsType<PublicPage<PublicVideo>>(Assert.IsType<OkObjectResult>(response.Result).Value);
        Assert.Equal(2, page.TotalCount);
        Assert.Single(page.Items);
        Assert.Equal("قصة إعلامية ثانية", page.Items[0].Title);
        Assert.Equal("arabic-two", page.Items[0].Slug);
        Assert.Equal("english-two", page.Items[0].AlternateSlug);
    }

    [Fact]
    public async Task Podcast_endpoints_return_only_published_podcast_media_with_localized_fields()
    {
        await using var db = NewDb();
        var category = new Category { Id = Guid.NewGuid(), NameEn = "Podcasts", NameAr = "بودكاست", SlugEn = "podcasts", SlugAr = "podcast", IsPublished = true };
        var video = Video(category, "video", "video-ar", "Video", "فيديو", DateTimeOffset.UtcNow);
        var podcast = Video(category, "episode-01", "al-halaqa-01", "Episode 01", "الحلقة 01", DateTimeOffset.UtcNow);
        podcast.ContentType = MediaContentType.Podcast; podcast.EpisodeNumber = 1; podcast.SeasonNumber = 2;
        podcast.GuestNameEn = "Demo Guest"; podcast.GuestNameAr = "ضيف تجريبي";
        podcast.SeoTitleAr = "الحلقة الأولى"; podcast.SeoDescriptionAr = "وصف الحلقة الأولى";
        var draftPodcast = Video(category, "episode-draft", "al-halaqa-draft", "Draft Episode", "حلقة مسودة", DateTimeOffset.UtcNow);
        draftPodcast.ContentType = MediaContentType.Podcast; draftPodcast.IsPublished = false;
        var scheduledPodcast = Video(category, "episode-scheduled", "al-halaqa-scheduled", "Scheduled Episode", "حلقة مجدولة", DateTimeOffset.UtcNow.AddDays(1));
        scheduledPodcast.ContentType = MediaContentType.Podcast;
        db.Videos.AddRange(video, podcast, draftPodcast, scheduledPodcast);
        await db.SaveChangesAsync();
        var controller = NewController(db);

        var listResponse = await controller.GetPodcasts("ar", page: 1, pageSize: 12);
        var list = Assert.IsType<PublicPage<PublicVideo>>(Assert.IsType<OkObjectResult>(listResponse.Result).Value);
        var detailResponse = await controller.GetPodcast("al-halaqa-01", "ar");
        var detail = Assert.IsType<PublicVideo>(Assert.IsType<OkObjectResult>(detailResponse.Result).Value);
        var draftDetail = await controller.GetPodcast("al-halaqa-draft", "ar");
        var scheduledDetail = await controller.GetPodcast("al-halaqa-scheduled", "ar");
        var nonPodcastDetail = await controller.GetPodcast("video-ar", "ar");
        var videos = await controller.GetVideos(page: 1, pageSize: 12);
        var videoPage = Assert.IsType<PublicPage<PublicVideo>>(Assert.IsType<OkObjectResult>(videos.Result).Value);

        Assert.Equal("الحلقة 01", Assert.Single(list.Items).Title);
        Assert.Equal("ضيف تجريبي", detail.GuestName);
        Assert.Equal(1, detail.EpisodeNumber);
        Assert.Equal(2, detail.SeasonNumber);
        Assert.Equal("الحلقة الأولى", detail.SeoTitle);
        Assert.Equal("وصف الحلقة الأولى", detail.SeoDescription);
        Assert.IsType<NotFoundResult>(draftDetail.Result);
        Assert.IsType<NotFoundResult>(scheduledDetail.Result);
        Assert.IsType<NotFoundResult>(nonPodcastDetail.Result);
        Assert.Equal("Video", Assert.Single(videoPage.Items).Title);
    }

    [Fact]
    public async Task Watch_endpoint_includes_all_eligible_non_podcast_media_and_excludes_podcasts_drafts_and_scheduled_items()
    {
        await using var db = NewDb();
        var category = new Category { Id = Guid.NewGuid(), NameEn = "Media", NameAr = "إعلام", SlugEn = "media", SlugAr = "ielam", IsPublished = true };
        var video = Video(category, "video", "video-ar", "Video", "فيديو", DateTimeOffset.UtcNow.AddDays(-1));
        var program = Video(category, "program", "program-ar", "Program", "برنامج", DateTimeOffset.UtcNow.AddDays(-1));
        program.ContentType = MediaContentType.Program;
        var podcast = Video(category, "podcast", "podcast-ar", "Podcast", "بودكاست", DateTimeOffset.UtcNow.AddDays(-1));
        podcast.ContentType = MediaContentType.Podcast;
        var draft = Video(category, "draft", "draft-ar", "Draft", "مسودة", DateTimeOffset.UtcNow.AddDays(-1));
        draft.IsPublished = false;
        var scheduled = Video(category, "scheduled", "scheduled-ar", "Scheduled", "مجدول", DateTimeOffset.UtcNow.AddDays(1));
        scheduled.ContentType = MediaContentType.Campaign;
        db.Videos.AddRange(video, program, podcast, draft, scheduled);
        await db.SaveChangesAsync();

        var listResponse = await NewController(db).GetVideos(page: 1, pageSize: 12);
        var list = Assert.IsType<PublicPage<PublicVideo>>(Assert.IsType<OkObjectResult>(listResponse.Result).Value);
        var programResponse = await NewController(db).GetVideo("program");
        var podcastResponse = await NewController(db).GetVideo("podcast");

        Assert.Equal(2, list.TotalCount);
        Assert.Contains(list.Items, item => item.ContentType == MediaContentType.Video);
        Assert.Contains(list.Items, item => item.ContentType == MediaContentType.Program);
        Assert.DoesNotContain(list.Items, item => item.ContentType == MediaContentType.Podcast);
        Assert.IsType<OkObjectResult>(programResponse.Result);
        Assert.IsType<NotFoundResult>(podcastResponse.Result);
    }

    [Fact]
    public async Task Empty_and_missing_public_content_returns_stable_empty_or_404_responses()
    {
        await using var db = NewDb();
        var controller = NewController(db);

        var videos = await controller.GetVideos(page: 1, pageSize: 12);
        var categories = await controller.GetCategories("ar");
        var missingVideo = await controller.GetVideo("does-not-exist");
        var missingArticle = await controller.GetArticle("does-not-exist");

        Assert.Empty(Assert.IsType<PublicPage<PublicVideo>>(Assert.IsType<OkObjectResult>(videos.Result).Value).Items);
        Assert.Empty(Assert.IsAssignableFrom<IReadOnlyList<PublicCategory>>(Assert.IsType<OkObjectResult>(categories.Result).Value));
        Assert.IsType<NotFoundResult>(missingVideo.Result);
        Assert.IsType<NotFoundResult>(missingArticle.Result);
    }

    [Theory]
    [InlineData("fr", 1, 12)]
    [InlineData("en", 0, 12)]
    [InlineData("en", 1, 51)]
    public async Task Public_video_api_rejects_invalid_language_and_pagination(string lang, int page, int size)
    {
        await using var db = NewDb();
        var response = await NewController(db).GetVideos(lang, page, size);

        Assert.IsType<BadRequestObjectResult>(response.Result);
    }

    [Fact]
    public async Task Public_video_api_rejects_invalid_sort_and_overlong_search()
    {
        await using var db = NewDb();
        var controller = NewController(db);

        var invalidSort = await controller.GetVideos(order: "random");
        var longSearch = await controller.GetVideos(search: new string('x', 121));

        Assert.IsType<BadRequestObjectResult>(invalidSort.Result);
        Assert.IsType<BadRequestObjectResult>(longSearch.Result);
    }

    [Fact]
    public void Admin_controllers_require_the_administrator_role_and_public_content_is_anonymous()
    {
        var adminControllers = new[]
        {
            typeof(AdminController), typeof(AdminVideoController), typeof(AdminPortfolioController),
            typeof(AdminArticleController), typeof(AdminSiteSettingsController)
        };

        foreach (var controller in adminControllers)
        {
            var authorize = controller.GetCustomAttribute<AuthorizeAttribute>();
            Assert.NotNull(authorize);
            Assert.Equal("Admin", authorize!.Roles);
        }

        Assert.NotNull(typeof(PublicContentController).GetCustomAttribute<AllowAnonymousAttribute>());
        Assert.NotNull(typeof(AuthController).GetMethod(nameof(AuthController.Login))!
            .GetCustomAttribute<Microsoft.AspNetCore.RateLimiting.EnableRateLimitingAttribute>());
    }

    [Fact]
    public void Login_contract_rejects_missing_or_malformed_credentials()
    {
        var invalid = new LoginRequest { Email = "not-an-email", Password = "" };
        var results = new List<ValidationResult>();

        var isValid = Validator.TryValidateObject(invalid, new ValidationContext(invalid), results, validateAllProperties: true);

        Assert.False(isValid);
        Assert.NotEmpty(results);
    }

    [Fact]
    public async Task Development_catalog_public_queries_hide_drafts_future_and_filter_podcasts()
    {
        await using var db=NewDb(); await DevelopmentSeeder.SeedAsync(db,"Development");
        var controller=NewController(db);
        var result=await controller.GetVideos("en",pageSize:50);
        var videos=Assert.IsType<PublicPage<PublicVideo>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.DoesNotContain(videos.Items,x=>x.Id==DevelopmentSeeder.Id(314)||x.Id==DevelopmentSeeder.Id(315));
        var podcastResult=await controller.GetPodcasts("ar",pageSize:50);
        var podcasts=Assert.IsType<PublicPage<PublicVideo>>(Assert.IsType<OkObjectResult>(podcastResult.Result).Value);
        Assert.Equal(5,podcasts.TotalCount); Assert.All(podcasts.Items,x=>Assert.Equal(MediaContentType.Podcast,x.ContentType));
        foreach(var term in new[]{"production","إنتاج"}) {
            var search=await controller.GetVideos("ar",pageSize:50,search:term);
            Assert.NotEmpty(Assert.IsType<PublicPage<PublicVideo>>(Assert.IsType<OkObjectResult>(search.Result).Value).Items);
        }
    }

    private static PublicContentController NewController(SpaceMediaDbContext db)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["PublicSite:BaseUrl"] = "https://east-west-hub.example.test"
        }).Build();
        return new PublicContentController(new PublicContentReader(db), configuration)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
    }

    private static SpaceMediaDbContext NewDb() => new(
        new DbContextOptionsBuilder<SpaceMediaDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static Video Video(Category category, string slugEn, string slugAr, string titleEn, string titleAr, DateTimeOffset publishedAt) => new()
    {
        Id = Guid.NewGuid(), YouTubeVideoId = Guid.NewGuid().ToString("N")[..11],
        Category = category, SlugEn = slugEn, SlugAr = slugAr, TitleEn = titleEn, TitleAr = titleAr,
        IsPublished = true, PublishedAt = publishedAt
    };
}

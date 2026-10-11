using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Xml.Linq;
using EastWestHub.Application.Content;

namespace EastWestHub.Api.Controllers;

[ApiController]
[AllowAnonymous]
[ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any, VaryByQueryKeys = new[] { "lang", "page", "pageSize", "category", "search", "tag", "featured", "order" })]
[Route("api/v1/public")]
public sealed class PublicContentController(IPublicContentReader contentReader, IConfiguration configuration) : ControllerBase
{
    [HttpGet("~/sitemap.xml")]
    [Produces("application/xml")]
    public async Task<IActionResult> GetSitemap(CancellationToken ct)
    {
        var baseUrl = (configuration["PublicSite:BaseUrl"] ?? $"{Request.Scheme}://{Request.Host.Value}").TrimEnd('/');
        var urls = new List<(string En, string Ar)>();
        foreach (var path in new[] { "", "watch", "podcasts", "categories", "services", "projects", "insights", "about", "contact", "search" })
            urls.Add(($"/{"en"}{(path.Length == 0 ? "" : $"/{path}")}", $"/{"ar"}{(path.Length == 0 ? "" : $"/{path}")}"));

        var categoriesEn = await contentReader.GetCategoriesAsync(false, ct);
        var categoriesAr = await contentReader.GetCategoriesAsync(true, ct);
        AddPairs("categories", categoriesEn.Select(x => (x.Id, x.Slug)).ToArray(), categoriesAr.Select(x => (x.Id, x.Slug)).ToArray(), urls);
        await AddPagedPairs("watch", (p, size) => contentReader.GetVideosAsync(false, p, size, null, null, null, null, "latest", ct), (p, size) => contentReader.GetVideosAsync(true, p, size, null, null, null, null, "latest", ct), urls, ct);
        await AddPagedPairs("podcasts", (p, size) => contentReader.GetPodcastsAsync(false, p, size, null, ct), (p, size) => contentReader.GetPodcastsAsync(true, p, size, null, ct), urls, ct);
        await AddPagedPairs("services", (p, size) => contentReader.GetServicesAsync(false, p, size, ct), (p, size) => contentReader.GetServicesAsync(true, p, size, ct), urls, ct);
        await AddPagedPairs("projects", (p, size) => contentReader.GetPortfolioAsync(false, p, size, ct), (p, size) => contentReader.GetPortfolioAsync(true, p, size, ct), urls, ct);
        await AddPagedPairs("insights", (p, size) => contentReader.GetArticlesAsync(false, p, size, ct), (p, size) => contentReader.GetArticlesAsync(true, p, size, ct), urls, ct);

        XNamespace xhtml = "http://www.w3.org/1999/xhtml";
        XNamespace xmlns = "http://www.sitemaps.org/schemas/sitemap/0.9";
        var root = new XElement(xmlns + "urlset", new XAttribute(XNamespace.Xmlns + "xhtml", xhtml));
        foreach (var (en, ar) in urls.Distinct())
        {
            foreach (var (path, locale, other) in new[] { (en, "en", ar), (ar, "ar", en) })
                root.Add(new XElement(xmlns + "url", new XElement(xmlns + "loc", baseUrl + path),
                    new XElement(xhtml + "link", new XAttribute("rel", "alternate"), new XAttribute("hreflang", locale), new XAttribute("href", baseUrl + path)),
                    new XElement(xhtml + "link", new XAttribute("rel", "alternate"), new XAttribute("hreflang", locale == "en" ? "ar" : "en"), new XAttribute("href", baseUrl + other)),
                    new XElement(xhtml + "link", new XAttribute("rel", "alternate"), new XAttribute("hreflang", "x-default"), new XAttribute("href", baseUrl + en))));
        }
        Response.Headers.CacheControl = "public, max-age=3600";
        return Content(new XDocument(new XDeclaration("1.0", "utf-8", "yes"), root).ToString(), "application/xml; charset=utf-8");
    }

    private static void AddPairs(string kind, (Guid Id, string Slug)[] en, (Guid Id, string Slug)[] ar, List<(string En, string Ar)> urls)
    {
        var arabic = ar.ToDictionary(x => x.Id, x => x.Slug);
        foreach (var item in en) if (arabic.TryGetValue(item.Id, out var arSlug)) urls.Add(($"/en/{kind}/{Uri.EscapeDataString(item.Slug)}", $"/ar/{kind}/{Uri.EscapeDataString(arSlug)}"));
    }

    private static async Task AddPagedPairs<T>(string kind,
        Func<int, int, Task<PublicPage<T>>> english, Func<int, int, Task<PublicPage<T>>> arabic,
        List<(string En, string Ar)> urls, CancellationToken ct) where T : notnull
    {
        var enItems = new List<T>(); var arItems = new List<T>();
        for (var page = 1; ; page++) { var result = await english(page, 50); enItems.AddRange(result.Items); if (enItems.Count >= result.TotalCount || result.Items.Count == 0) break; }
        for (var page = 1; ; page++) { var result = await arabic(page, 50); arItems.AddRange(result.Items); if (arItems.Count >= result.TotalCount || result.Items.Count == 0) break; }
        var id = typeof(T).GetProperty("Id")!; var slug = typeof(T).GetProperty("Slug")!;
        var arLookup = arItems.ToDictionary(x => (Guid)id.GetValue(x)!, x => (string)slug.GetValue(x)!);
        foreach (var item in enItems) if (arLookup.TryGetValue((Guid)id.GetValue(item)!, out var arSlug))
            urls.Add(($"/en/{kind}/{Uri.EscapeDataString((string)slug.GetValue(item)!)}", $"/ar/{kind}/{Uri.EscapeDataString(arSlug)}"));
    }
    [HttpGet("site")]
    public async Task<ActionResult<PublicSiteSettings>> GetSiteSettings(
        [FromQuery] string lang = "en", CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        var settings = await contentReader.GetSiteSettingsAsync(isArabic, cancellationToken);
        return settings is null ? NotFound() : Ok(settings);
    }

    [HttpGet("categories")]
    public async Task<ActionResult<IReadOnlyList<PublicCategory>>> GetCategories(
        [FromQuery] string lang = "en", CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        return Ok(await contentReader.GetCategoriesAsync(isArabic, cancellationToken));
    }

    [HttpGet("tags")]
    public async Task<ActionResult<IReadOnlyList<PublicTag>>> GetTags(
        [FromQuery] string lang = "en", CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        return Ok(await contentReader.GetTagsAsync(isArabic, cancellationToken));
    }

    [HttpGet("videos")]
    public async Task<ActionResult<PublicPage<PublicVideo>>> GetVideos(
        [FromQuery] string lang = "en", [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12, [FromQuery] string? category = null,
        [FromQuery] string? search = null, [FromQuery] string? tag = null,
        [FromQuery] bool? featured = null, [FromQuery] string order = "featured",
        CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        if (!ValidPage(page, pageSize)) return InvalidPagination();
        if (search?.Length > 120 || tag?.Length > 120 || !new[] { "featured", "latest", "oldest" }.Contains(order, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new ProblemDetails { Title = "Invalid video filters", Detail = "Search and tag values must be at most 120 characters; order must be featured, latest, or oldest." });
        return Ok(await contentReader.GetVideosAsync(isArabic, page, pageSize, category, search, tag, featured, order, cancellationToken));
    }

    [HttpGet("videos/{slug}")]
    public async Task<ActionResult<PublicVideo>> GetVideo(
        string slug, [FromQuery] string lang = "en", CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        var video = await contentReader.GetVideoAsync(isArabic, slug, cancellationToken);
        return video is null ? NotFound() : Ok(video);
    }

    [HttpGet("podcasts")]
    public async Task<ActionResult<PublicPage<PublicVideo>>> GetPodcasts(
        [FromQuery] string lang = "en", [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12, [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        if (!ValidPage(page, pageSize)) return InvalidPagination();
        if (search?.Length > 120) return BadRequest(new ProblemDetails { Title = "Invalid podcast search", Detail = "Search must be at most 120 characters." });
        return Ok(await contentReader.GetPodcastsAsync(isArabic, page, pageSize, search, cancellationToken));
    }

    [HttpGet("podcasts/{slug}")]
    public async Task<ActionResult<PublicVideo>> GetPodcast(
        string slug, [FromQuery] string lang = "en", CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        var podcast = await contentReader.GetPodcastAsync(isArabic, slug, cancellationToken);
        return podcast is null ? NotFound() : Ok(podcast);
    }

    [HttpGet("services")]
    public async Task<ActionResult<PublicPage<PublicService>>> GetServices(
        [FromQuery] string lang = "en", [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12, CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        if (!ValidPage(page, pageSize)) return InvalidPagination();
        return Ok(await contentReader.GetServicesAsync(isArabic, page, pageSize, cancellationToken));
    }

    [HttpGet("services/{slug}")]
    public async Task<ActionResult<PublicService>> GetService(
        string slug, [FromQuery] string lang = "en", CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        var service = await contentReader.GetServiceAsync(isArabic, slug, cancellationToken);
        return service is null ? NotFound() : Ok(service);
    }

    [HttpGet("portfolio")]
    public async Task<ActionResult<PublicPage<PublicPortfolioProject>>> GetPortfolio(
        [FromQuery] string lang = "en", [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12, CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        if (!ValidPage(page, pageSize)) return InvalidPagination();
        return Ok(await contentReader.GetPortfolioAsync(isArabic, page, pageSize, cancellationToken));
    }

    [HttpGet("portfolio/{slug}")]
    public async Task<ActionResult<PublicPortfolioProject>> GetPortfolioProject(
        string slug, [FromQuery] string lang = "en", CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        var project = await contentReader.GetPortfolioProjectAsync(isArabic, slug, cancellationToken);
        return project is null ? NotFound() : Ok(project);
    }

    [HttpGet("articles")]
    public async Task<ActionResult<PublicPage<PublicArticle>>> GetArticles(
        [FromQuery] string lang = "en", [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12, CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        if (!ValidPage(page, pageSize)) return InvalidPagination();
        return Ok(await contentReader.GetArticlesAsync(isArabic, page, pageSize, cancellationToken));
    }

    [HttpGet("articles/{slug}")]
    public async Task<ActionResult<PublicArticle>> GetArticle(
        string slug, [FromQuery] string lang = "en", CancellationToken cancellationToken = default)
    {
        if (!TryResolveLanguage(lang, out var isArabic)) return InvalidLanguage();
        var article = await contentReader.GetArticleAsync(isArabic, slug, cancellationToken);
        return article is null ? NotFound() : Ok(article);
    }

    private static bool TryResolveLanguage(string language, out bool isArabic)
    {
        isArabic = string.Equals(language, "ar", StringComparison.OrdinalIgnoreCase);
        return isArabic || string.Equals(language, "en", StringComparison.OrdinalIgnoreCase);
    }

    private static bool ValidPage(int page, int pageSize) => page is >= 1 and <= 100_000 && pageSize is >= 1 and <= 50;

    private BadRequestObjectResult InvalidLanguage() => BadRequest(new ProblemDetails
    {
        Title = "Unsupported language",
        Detail = "The lang query parameter must be either 'en' or 'ar'.",
        Status = StatusCodes.Status400BadRequest
    });

    private BadRequestObjectResult InvalidPagination() => BadRequest(new ProblemDetails
    {
        Title = "Invalid pagination",
        Detail = "Page must be at least 1 and pageSize must be between 1 and 50.",
        Status = StatusCodes.Status400BadRequest
    });
}

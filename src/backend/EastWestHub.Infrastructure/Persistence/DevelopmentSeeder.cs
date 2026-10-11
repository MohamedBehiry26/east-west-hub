using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using EastWestHub.Domain.Entities;

namespace EastWestHub.Infrastructure.Persistence;

public static class DevelopmentSeeder
{
    public static Guid Id(int value) => Guid.Parse($"{value:00000000}-0000-0000-0000-{value:000000000000}");

    public static async Task SeedAsync(EastWestHubDbContext db, string environmentName, CancellationToken ct = default)
    {
        if (!string.Equals(environmentName, "Development", StringComparison.Ordinal)) return;
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        var catalog = Read<DemoCatalog>("DemoCatalog.json");
        var categories = new Dictionary<Guid, Guid>(); var services = new Dictionary<Guid, Guid>(); var tags = new Dictionary<Guid, Guid>();
        foreach (var item in catalog.Categories) categories[item.Id] = await InsertOrUpgrade(db, item, ct);
        foreach (var item in Read<List<Service>>("Services.json")) services[item.Id] = await InsertOrUpgrade(db, item, ct);
        foreach (var item in catalog.Tags) tags[item.Id] = await InsertOrUpgrade(db, item, ct);
        await db.SaveChangesAsync(ct);
        // Only exact obsolete QA services qualify for retirement; modified editorial records remain intact.
        foreach (var service in await db.Services.Where(s => s.Id == Id(901) || s.Id == Id(902)).ToListAsync(ct))
            if ((service.TitleEn == "Demo: Content Production" || service.TitleEn == "Demo: Video Editing (Draft)") &&
                (service.ShortDescriptionEn == "Fictional sample for testing bilingual service pages." || service.ShortDescriptionEn == "Fictional development sample."))
            {
                db.ServicePortfolioProjects.RemoveRange(await db.ServicePortfolioProjects.Where(x => x.ServiceId == service.Id).ToListAsync(ct));
                db.Services.Remove(service);
            }
        var author = await db.ContentAuthors.FirstOrDefaultAsync(x => x.Id == Id(200) || x.Email == "content-editor@example.test", ct);
        if (author is null)
        {
            author = new User { Id = Id(200), Email = "content-editor@example.test", DisplayName = "Development Editorial Desk", IsActive = true };
            db.ContentAuthors.Add(author);
        }
        await db.SaveChangesAsync(ct);
        foreach (var item in catalog.Media)
        {
            item.CategoryId = categories[item.CategoryId];
            foreach (var link in item.VideoTags) link.TagId = tags[link.TagId];
            await InsertOrUpgrade(db, item, ct);
        }
        foreach (var item in catalog.Projects)
        {
            foreach (var link in item.ServicesUsed) link.ServiceId = services[link.ServiceId];
            await InsertOrUpgrade(db, item, ct);
        }
        foreach (var item in catalog.Articles) { item.AuthorId = author.Id; await InsertOrUpgrade(db, item, ct); }
        var settings = await db.SiteSettings.FirstOrDefaultAsync(x => x.Id == 1, ct);
        if (settings is null) { settings = new SiteSetting { Id = 1, AgencyNameEn = "East West Hub", AgencyNameAr = "إيست ويست هب" }; db.SiteSettings.Add(settings); }
        if (settings.AgencyDescriptionEn is null or "Development environment sample settings." or "Media, content, and creative platform. Update this sample with approved company information.")
        {
            settings.AgencyDescriptionEn = "Content development, production, video, podcasts, campaigns, media relations, events and digital platform management.";
            settings.AgencyDescriptionAr = "تطوير المحتوى والإنتاج والفيديو والبودكاست والحملات والعلاقات الإعلامية والفعاليات وإدارة المنصات الرقمية.";
        }
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
    }

    private static T Read<T>(string filename)
    {
        using var stream = typeof(DevelopmentSeeder).Assembly.GetManifestResourceStream($"EastWestHub.Infrastructure.Persistence.SeedData.{filename}") ?? throw new InvalidOperationException($"Missing development catalog: {filename}");
        return JsonSerializer.Deserialize<T>(stream) ?? throw new InvalidOperationException("Invalid development catalog.");
    }

    private static async Task<Guid> InsertOrUpgrade<T>(EastWestHubDbContext db, T incoming, CancellationToken ct) where T : class
    {
        var id = (Guid)typeof(T).GetProperty("Id")!.GetValue(incoming)!;
        var en = (string)typeof(T).GetProperty("SlugEn")!.GetValue(incoming)!;
        var ar = (string)typeof(T).GetProperty("SlugAr")!.GetValue(incoming)!;
        var existing = await db.Set<T>().FindAsync([id], ct);
        if (existing is null)
        {
            var collision = await db.Set<T>().FirstOrDefaultAsync(x => EF.Property<string>(x, "SlugEn") == en || EF.Property<string>(x, "SlugAr") == ar, ct);
            if (collision is not null) return (Guid)typeof(T).GetProperty("Id")!.GetValue(collision)!;
            if (incoming is Video { YouTubeVideoId: not null } video && await db.Videos.AnyAsync(x => x.YouTubeVideoId == video.YouTubeVideoId, ct)) video.YouTubeVideoId = null;
            db.Add(incoming);
        }
        else if (IsUntouchedLegacy(existing))
        {
            // Preserve existing category URLs and avoid transient unique-slug collisions during upgrades.
            if (existing is Category oldCategory && incoming is Category newCategory)
            { newCategory.SlugEn = oldCategory.SlugEn; newCategory.SlugAr = oldCategory.SlugAr; }
            // Replace only exact old fixture bodies. New catalog bodies never meet this predicate.
            if (existing is Video oldVideo && incoming is Video newVideo)
            {
                await db.Entry(oldVideo).Collection(x => x.VideoTags).LoadAsync(ct);
                db.VideoTags.RemoveRange(oldVideo.VideoTags);
                await db.SaveChangesAsync(ct);
                oldVideo.VideoTags = newVideo.VideoTags;
                db.VideoTags.AddRange(oldVideo.VideoTags);
            }
            if (existing is PortfolioProject oldProject && incoming is PortfolioProject newProject)
            {
                await db.Entry(oldProject).Collection(x => x.Images).LoadAsync(ct);
                await db.Entry(oldProject).Collection(x => x.ServicesUsed).LoadAsync(ct);
                db.PortfolioImages.RemoveRange(oldProject.Images); db.ServicePortfolioProjects.RemoveRange(oldProject.ServicesUsed);
                await db.SaveChangesAsync(ct);
                oldProject.Images = newProject.Images; oldProject.ServicesUsed = newProject.ServicesUsed;
                db.PortfolioImages.AddRange(oldProject.Images);
                db.ServicePortfolioProjects.AddRange(oldProject.ServicesUsed);
            }
            db.Entry(existing).CurrentValues.SetValues(incoming);
        }
        return id;
    }

    private static bool IsUntouchedLegacy<T>(T item) => item switch
    {
        Service s => Enumerable.Range(400, 10).Select(Id).Contains(s.Id) && s.ShortDescriptionEn is "Development sample service description." or "A development sample service. Replace with approved business information.",
        Category c => Enumerable.Range(100, 8).Select(Id).Contains(c.Id) && c.DescriptionEn?.StartsWith("Development sample", StringComparison.Ordinal) == true,
        Video v => Enumerable.Range(300, 3).Select(Id).Contains(v.Id) && v.DescriptionEn == "Fictional development sample. Replace with approved media content.",
        PortfolioProject p => new[] { 501, 502, 503, 504, 911, 913 }.Select(Id).Contains(p.Id) && p.DescriptionEn is "Fictional development sample. No real client or performance claim." or "Fictional development sample. No real client or result is represented." or "Fictional project sample for testing case studies and galleries. No real client or results are represented.",
        Article a => new[] { 601, 602, 603, 604, 605, 921, 922 }.Select(Id).Contains(a.Id) && a.ContentEn is "Development sample only. Replace this copy with approved editorial content." or "Development sample only. Replace with approved editorial content.",
        _ => false
    };
    private sealed class DemoCatalog
    {
        public List<Category> Categories { get; set; } = [];
        public List<Tag> Tags { get; set; } = [];
        public List<Video> Media { get; set; } = [];
        public List<PortfolioProject> Projects { get; set; } = [];
        public List<Article> Articles { get; set; } = [];
    }
}

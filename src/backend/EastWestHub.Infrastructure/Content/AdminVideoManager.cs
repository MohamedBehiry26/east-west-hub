using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using EastWestHub.Application.Content;
using EastWestHub.Domain.Entities;
using EastWestHub.Infrastructure.Persistence;

namespace EastWestHub.Infrastructure.Content;

public sealed class AdminVideoManager(EastWestHubDbContext db) : IAdminVideoManager
{
    private static readonly Regex YouTubeVideoId = new("^[A-Za-z0-9_-]{11}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public async Task<IReadOnlyList<AdminCategoryContent>> GetCategoriesAsync(CancellationToken ct) =>
        await db.Categories.AsNoTracking().OrderBy(x => x.DisplayOrder).ThenBy(x => x.NameEn).Select(x => ToCategory(x)).ToListAsync(ct);

    public async Task<AdminCategoryContent?> SaveCategoryAsync(Guid? id, SaveAdminCategory input, CancellationToken ct)
    {
        var entity = id is null ? new Category { NameEn = input.NameEn.Trim(), NameAr = input.NameAr.Trim(), SlugEn = input.SlugEn.Trim(), SlugAr = input.SlugAr.Trim() } : await db.Categories.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return null;
        entity.NameEn = input.NameEn.Trim(); entity.NameAr = input.NameAr.Trim(); entity.SlugEn = input.SlugEn.Trim(); entity.SlugAr = input.SlugAr.Trim();
        entity.DescriptionEn = NullIfWhiteSpace(input.DescriptionEn); entity.DescriptionAr = NullIfWhiteSpace(input.DescriptionAr); entity.ImageUrl = NullIfWhiteSpace(input.ImageUrl); entity.DisplayOrder = input.DisplayOrder; entity.IsPublished = input.IsPublished;
        if (id is null) db.Categories.Add(entity);
        await SaveAsync(ct); return ToCategory(entity);
    }

    public async Task<bool> DeleteCategoryAsync(Guid id, CancellationToken ct)
    {
        var category = await db.Categories.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (category is null) return false;
        if (await db.Videos.AnyAsync(x => x.CategoryId == id, ct)) throw new VideoAdministrationConflictException("A category with videos cannot be deleted.");
        db.Categories.Remove(category); await SaveAsync(ct); return true;
    }

    public async Task<IReadOnlyList<AdminVideoContent>> GetVideosAsync(CancellationToken ct) =>
        (await db.Videos.AsNoTracking().Include(x => x.Category).Include(x => x.VideoTags).ThenInclude(x => x.Tag).OrderBy(x => x.DisplayOrder).ThenBy(x => x.TitleEn).ToListAsync(ct)).Select(ToVideo).ToArray();

    public async Task<AdminVideoContent?> SaveVideoAsync(Guid? id, SaveAdminVideo input, CancellationToken ct)
    {
        var existing = id is null ? null : await db.Videos.Include(x => x.Category).Include(x => x.VideoTags).ThenInclude(x => x.Tag).SingleOrDefaultAsync(x => x.Id == id, ct);
        if (id is not null && existing is null) return null;
        // An omitted link on update retains the existing link/poster-only state.
        // New manual media still requires a valid YouTube link.
        var videoId = string.IsNullOrWhiteSpace(input.YouTubeUrl) && existing is not null
            ? existing.YouTubeVideoId : ExtractYouTubeVideoId(input.YouTubeUrl);
        if (!Enum.IsDefined(input.ContentType)) throw new VideoAdministrationConflictException("Select a supported media content type.");
        if (input.EpisodeNumber is < 1 || input.SeasonNumber is < 1) throw new VideoAdministrationConflictException("Podcast episode and season numbers must be positive when provided.");
        if (!await db.Categories.AnyAsync(x => x.Id == input.CategoryId, ct)) throw new VideoAdministrationConflictException("Select an existing category.");
        if (videoId is not null && await db.Videos.AnyAsync(x => x.YouTubeVideoId == videoId && x.Id != id, ct)) throw new VideoAdministrationConflictException("This YouTube video has already been added.");

        var entity = existing ?? new Video { Id = Guid.NewGuid(), TitleEn = input.TitleEn.Trim(), TitleAr = input.TitleAr.Trim(), SlugEn = input.SlugEn.Trim(), SlugAr = input.SlugAr.Trim(), YouTubeVideoId = videoId };
        if (entity is null) return null;
        entity.YouTubeVideoId = videoId; entity.TitleEn = input.TitleEn.Trim(); entity.TitleAr = input.TitleAr.Trim(); entity.SlugEn = input.SlugEn.Trim(); entity.SlugAr = input.SlugAr.Trim();
        entity.DescriptionEn = NullIfWhiteSpace(input.DescriptionEn); entity.DescriptionAr = NullIfWhiteSpace(input.DescriptionAr); entity.ThumbnailUrl = NullIfWhiteSpace(input.ThumbnailUrl);
        entity.CategoryId = input.CategoryId; entity.IsFeatured = input.IsFeatured; entity.IsPublished = input.IsPublished; entity.DisplayOrder = input.DisplayOrder; entity.ContentType = input.ContentType;
        entity.EpisodeNumber = input.EpisodeNumber; entity.SeasonNumber = input.SeasonNumber;
        entity.GuestNameEn = NullIfWhiteSpace(input.GuestNameEn); entity.GuestNameAr = NullIfWhiteSpace(input.GuestNameAr);
        entity.SeoTitleEn = NullIfWhiteSpace(input.SeoTitleEn); entity.SeoTitleAr = NullIfWhiteSpace(input.SeoTitleAr); entity.SeoDescriptionEn = NullIfWhiteSpace(input.SeoDescriptionEn); entity.SeoDescriptionAr = NullIfWhiteSpace(input.SeoDescriptionAr);
        var selectedTags = new List<Tag>();
        var seenTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var tagInput in input.Tags.Where(tag => !string.IsNullOrWhiteSpace(tag.NameEn) || !string.IsNullOrWhiteSpace(tag.NameAr)))
        {
            var en = string.IsNullOrWhiteSpace(tagInput.NameEn) ? tagInput.NameAr.Trim() : tagInput.NameEn.Trim(); var ar = string.IsNullOrWhiteSpace(tagInput.NameAr) ? en : tagInput.NameAr.Trim(); var slug = ToSlug(en);
            if (!seenTags.Add(slug)) continue;
            var tag = await db.Tags.FirstOrDefaultAsync(x => x.SlugEn == slug, ct) ?? new Tag { NameEn = en, NameAr = ar, SlugEn = slug, SlugAr = ToSlug(ar) };
            if (tag.Id == Guid.Empty) db.Tags.Add(tag);
            selectedTags.Add(tag);
        }
        foreach (var link in entity.VideoTags.Where(link => !selectedTags.Any(tag => tag.Id == link.TagId)).ToArray())
            entity.VideoTags.Remove(link);
        foreach (var tag in selectedTags.Where(tag => !entity.VideoTags.Any(link => link.TagId == tag.Id)))
            entity.VideoTags.Add(new VideoTag { Video = entity, Tag = tag });
        if (id is null) db.Videos.Add(entity);
        await SaveAsync(ct);
        entity.Category = await db.Categories.SingleAsync(x => x.Id == entity.CategoryId, ct);
        return ToVideo(entity);
    }

    public async Task<bool> DeleteVideoAsync(Guid id, CancellationToken ct) { var entity = await db.Videos.SingleOrDefaultAsync(x => x.Id == id, ct); if (entity is null) return false; db.Videos.Remove(entity); await SaveAsync(ct); return true; }

    public static string ExtractYouTubeVideoId(string? source)
    {
        if (string.IsNullOrWhiteSpace(source) || !Uri.TryCreate(source.Trim(), UriKind.Absolute, out var uri) || uri.Scheme is not ("https" or "http")) throw new VideoAdministrationConflictException("Enter a valid YouTube video link.");
        var host = uri.Host.ToLowerInvariant(); string? id = null;
        if (host is "youtu.be" or "www.youtu.be") id = uri.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        else if (host is "youtube.com" or "www.youtube.com" or "m.youtube.com")
        {
            var segments = uri.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (uri.AbsolutePath.Equals("/watch", StringComparison.OrdinalIgnoreCase)) id = uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries).Select(part => part.Split('=', 2)).FirstOrDefault(part => part.Length == 2 && part[0].Equals("v", StringComparison.OrdinalIgnoreCase)) is { Length: 2 } queryPart ? Uri.UnescapeDataString(queryPart[1]) : null;
            else if (segments.Length >= 2 && (segments[0].Equals("shorts", StringComparison.OrdinalIgnoreCase) || segments[0].Equals("embed", StringComparison.OrdinalIgnoreCase))) id = segments[1];
        }
        if (id is null || !YouTubeVideoId.IsMatch(id)) throw new VideoAdministrationConflictException("Enter a valid YouTube video link.");
        return id;
    }

    private async Task SaveAsync(CancellationToken ct) { try { await db.SaveChangesAsync(ct); } catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation }) { throw new VideoAdministrationConflictException("A video, category, or tag already uses one of these values."); } }
    private static string? NullIfWhiteSpace(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static AdminCategoryContent ToCategory(Category x) => new(x.Id, x.NameEn, x.NameAr, x.SlugEn, x.SlugAr, x.DescriptionEn, x.DescriptionAr, x.ImageUrl, x.DisplayOrder, x.IsPublished, x.Version);
    private static AdminVideoContent ToVideo(Video x) => new(x.Id, x.YouTubeVideoId, x.TitleEn, x.TitleAr, x.SlugEn, x.SlugAr, x.DescriptionEn, x.DescriptionAr, x.ThumbnailUrl, x.PublishedAt, x.Duration, x.CategoryId, x.Category.NameEn, x.Category.NameAr, x.IsFeatured, x.IsPublished, x.DisplayOrder, x.VideoTags.OrderBy(link => link.Tag.NameEn).Select(link => new AdminVideoTagInput(link.Tag.NameEn, link.Tag.NameAr)).ToArray(), x.ContentType, x.EpisodeNumber, x.SeasonNumber, x.GuestNameEn, x.GuestNameAr, x.SeoTitleEn, x.SeoTitleAr, x.SeoDescriptionEn, x.SeoDescriptionAr, x.Version);
    private static string ToSlug(string value) { var normalized = value.Normalize(NormalizationForm.FormD); var plain = new string(normalized.Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray()).Normalize(NormalizationForm.FormC); var slug = Regex.Replace(plain.Trim().ToLowerInvariant(), @"[^\p{L}\p{Nd}]+", "-").Trim('-'); return string.IsNullOrWhiteSpace(slug) ? Guid.NewGuid().ToString("N") : slug.Length > 120 ? slug[..120].TrimEnd('-') : slug; }
}

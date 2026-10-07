using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SpaceMedia.Application.Content;
using SpaceMedia.Domain.Entities;
using SpaceMedia.Infrastructure.Persistence;

namespace SpaceMedia.Infrastructure.Content;

public sealed class AdminVideoManager(SpaceMediaDbContext db, IYouTubeService youTube) : IAdminVideoManager
{
    public async Task<IReadOnlyList<AdminCategoryContent>> GetCategoriesAsync(CancellationToken ct) =>
        await db.Categories.AsNoTracking().OrderBy(x => x.DisplayOrder).ThenBy(x => x.NameEn)
            .Select(x => ToCategory(x)).ToListAsync(ct);

    public async Task<AdminCategoryContent?> SaveCategoryAsync(Guid? id, SaveAdminCategory input, CancellationToken ct)
    {
        var entity = id is null ? new Category { NameEn = input.NameEn.Trim(), NameAr = input.NameAr.Trim(), SlugEn = input.SlugEn.Trim(), SlugAr = input.SlugAr.Trim() }
            : await db.Categories.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return null;
        entity.NameEn = input.NameEn.Trim(); entity.NameAr = input.NameAr.Trim(); entity.SlugEn = input.SlugEn.Trim(); entity.SlugAr = input.SlugAr.Trim();
        entity.DescriptionEn = input.DescriptionEn; entity.DescriptionAr = input.DescriptionAr; entity.ImageUrl = input.ImageUrl;
        entity.DisplayOrder = input.DisplayOrder; entity.IsPublished = input.IsPublished;
        if (id is null) db.Categories.Add(entity);
        await SaveAsync(ct);
        return ToCategory(entity);
    }

    public async Task<bool> DeleteCategoryAsync(Guid id, CancellationToken ct)
    {
        var category = await db.Categories.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (category is null) return false;
        if (await db.Videos.AnyAsync(x => x.CategoryId == id, ct)) throw new VideoAdministrationConflictException("A category with videos cannot be deleted.");
        db.Categories.Remove(category); await SaveAsync(ct); return true;
    }

    public async Task<IReadOnlyList<AdminVideoContent>> GetVideosAsync(CancellationToken ct) =>
        (await db.Videos.AsNoTracking().Include(x => x.Category).Include(x => x.VideoTags).ThenInclude(x => x.Tag)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.TitleEn).ToListAsync(ct)).Select(ToVideo).ToArray();

    public async Task<AdminVideoContent?> SaveVideoAsync(Guid? id, SaveAdminVideo input, CancellationToken ct)
    {
        if (!Enum.IsDefined(input.ContentType)) throw new VideoAdministrationConflictException("Select a supported media content type.");
        if (input.ContentType == MediaContentType.Podcast && (input.EpisodeNumber is < 1 || input.SeasonNumber is < 1))
            throw new VideoAdministrationConflictException("Podcast episode and season numbers must be positive when provided.");
        if (!await db.Categories.AnyAsync(x => x.Id == input.CategoryId, ct)) throw new VideoAdministrationConflictException("Select an existing category.");
        var entity = id is null ? null : await db.Videos.Include(x => x.Category).Include(x => x.VideoTags).ThenInclude(x => x.Tag).SingleOrDefaultAsync(x => x.Id == id, ct);
        if (id is not null && entity is null) return null;
        if (entity is null) throw new VideoAdministrationConflictException("Videos are created by YouTube synchronization; edit a synchronized video instead.");
        entity.TitleEn = input.TitleEn.Trim(); entity.TitleAr = input.TitleAr.Trim(); entity.SlugEn = input.SlugEn.Trim(); entity.SlugAr = input.SlugAr.Trim();
        entity.DescriptionEn = input.DescriptionEn; entity.DescriptionAr = input.DescriptionAr; entity.ThumbnailUrl = input.ThumbnailUrl;
        entity.CategoryId = input.CategoryId; entity.IsFeatured = input.IsFeatured; entity.IsPublished = input.IsPublished; entity.DisplayOrder = input.DisplayOrder;
        entity.ContentType = input.ContentType;
        entity.EpisodeNumber = input.ContentType == MediaContentType.Podcast ? input.EpisodeNumber : null;
        entity.SeasonNumber = input.ContentType == MediaContentType.Podcast ? input.SeasonNumber : null;
        entity.GuestNameEn = input.ContentType == MediaContentType.Podcast ? input.GuestNameEn : null;
        entity.GuestNameAr = input.ContentType == MediaContentType.Podcast ? input.GuestNameAr : null;
        entity.SeoTitleEn = input.SeoTitleEn; entity.SeoTitleAr = input.SeoTitleAr;
        entity.SeoDescriptionEn = input.SeoDescriptionEn; entity.SeoDescriptionAr = input.SeoDescriptionAr;
        var requested = input.Tags.Where(tag => !string.IsNullOrWhiteSpace(tag.NameEn) || !string.IsNullOrWhiteSpace(tag.NameAr)).ToArray();
        entity.VideoTags.Clear();
        var seenTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var tagInput in requested)
        {
            var en = string.IsNullOrWhiteSpace(tagInput.NameEn) ? tagInput.NameAr.Trim() : tagInput.NameEn.Trim();
            var ar = string.IsNullOrWhiteSpace(tagInput.NameAr) ? en : tagInput.NameAr.Trim();
            var slugBase = ToSlug(en);
            if (!seenTags.Add(slugBase)) continue;
            var tag = await db.Tags.FirstOrDefaultAsync(x => x.SlugEn == slugBase, ct);
            if (tag is null)
            {
                tag = new Tag { NameEn = en, NameAr = ar, SlugEn = slugBase, SlugAr = ToSlug(ar) };
                db.Tags.Add(tag);
            }
            entity.VideoTags.Add(new VideoTag { Video = entity, Tag = tag });
        }
        await SaveAsync(ct);
        var saved = await db.Videos.AsNoTracking().Include(x => x.Category).Include(x => x.VideoTags).ThenInclude(x => x.Tag)
            .SingleAsync(x => x.Id == entity.Id, ct);
        return ToVideo(saved);
    }

    public async Task<bool> DeleteVideoAsync(Guid id, CancellationToken ct)
    {
        var entity = await db.Videos.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return false;
        db.Videos.Remove(entity); await SaveAsync(ct); return true;
    }

    public async Task<YouTubeSyncResult> SyncYouTubeAsync(Guid categoryId, CancellationToken ct)
    {
        if (!await db.Categories.AnyAsync(x => x.Id == categoryId, ct)) throw new VideoAdministrationConflictException("Select an existing category for newly discovered videos.");
        var channelId = await db.SiteSettings.AsNoTracking().OrderBy(x => x.Id).Select(x => x.YouTubeChannelId).FirstOrDefaultAsync(ct);
        var remote = await youTube.GetUploadsAsync(ct, channelId);
        var added = 0; var updated = 0; var skipped = 0;
        foreach (var item in remote)
        {
            if (string.IsNullOrWhiteSpace(item.VideoId) || item.VideoId.Length > 32 || string.IsNullOrWhiteSpace(item.Title)) { skipped++; continue; }
            var existing = await db.Videos.Include(x => x.VideoTags).ThenInclude(x => x.Tag).SingleOrDefaultAsync(x => x.YouTubeVideoId == item.VideoId, ct);
            if (existing is null)
            {
                var slug = $"video-{item.VideoId.ToLowerInvariant()}";
                existing = new Video
                {
                    YouTubeVideoId = item.VideoId, YouTubeTitle = item.Title, YouTubeDescription = item.Description, TitleEn = item.Title, TitleAr = item.Title,
                    SlugEn = slug, SlugAr = slug, DescriptionEn = item.Description, DescriptionAr = item.Description,
                    YouTubeThumbnailUrl = item.ThumbnailUrl, PublishedAt = item.PublishedAt, Duration = item.Duration,
                    CategoryId = categoryId, ContentType = MediaContentType.Video, IsPublished = false, IsFeatured = false, DisplayOrder = 0
                };
                foreach (var youtubeTag in item.Tags.Take(20))
                {
                    var tagName = youtubeTag.Trim();
                    if (tagName.Length is 0 or > 100) continue;
                    var tagSlug = ToSlug(tagName);
                    var tag = await db.Tags.FirstOrDefaultAsync(x => x.SlugEn == tagSlug, ct);
                    if (tag is null)
                    {
                        tag = new Tag { NameEn = tagName, NameAr = tagName, SlugEn = tagSlug, SlugAr = tagSlug };
                        db.Tags.Add(tag);
                    }
                    existing.VideoTags.Add(new VideoTag { Video = existing, Tag = tag });
                }
                db.Videos.Add(existing);
                added++;
            }
            else
            {
                // Website-managed bilingual copy, category, visibility, featured flag, order, and tags are retained.
                existing.YouTubeTitle = item.Title;
                existing.YouTubeDescription = item.Description;
                existing.YouTubeThumbnailUrl = item.ThumbnailUrl;
                existing.PublishedAt = item.PublishedAt;
                existing.Duration = item.Duration;
                updated++;
            }
        }
        await SaveAsync(ct);
        return new YouTubeSyncResult(added, updated, skipped);
    }

    private async Task SaveAsync(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { throw new VideoAdministrationConflictException("A video, category, or tag already uses one of these slugs."); }
    }

    private static AdminCategoryContent ToCategory(Category x) => new(x.Id, x.NameEn, x.NameAr, x.SlugEn, x.SlugAr, x.DescriptionEn, x.DescriptionAr, x.ImageUrl, x.DisplayOrder, x.IsPublished);
    private static AdminVideoContent ToVideo(Video x) => new(x.Id, x.YouTubeVideoId, x.TitleEn, x.TitleAr, x.SlugEn, x.SlugAr, x.DescriptionEn, x.DescriptionAr, x.ThumbnailUrl ?? x.YouTubeThumbnailUrl, x.PublishedAt, x.Duration, x.CategoryId, x.Category.NameEn, x.Category.NameAr, x.IsFeatured, x.IsPublished, x.DisplayOrder,
        x.VideoTags.OrderBy(link => link.Tag.NameEn).Select(link => new AdminVideoTagInput(link.Tag.NameEn, link.Tag.NameAr)).ToArray(),
        x.ContentType, x.EpisodeNumber, x.SeasonNumber, x.GuestNameEn, x.GuestNameAr,
        x.SeoTitleEn, x.SeoTitleAr, x.SeoDescriptionEn, x.SeoDescriptionAr);
    private static string ToSlug(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var plain = new string(normalized.Where(character => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(character) != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray()).Normalize(NormalizationForm.FormC);
        var slug = Regex.Replace(plain.Trim().ToLowerInvariant(), @"[^\p{L}\p{Nd}]+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? Guid.NewGuid().ToString("N") : slug.Length > 120 ? slug[..120].TrimEnd('-') : slug;
    }
}

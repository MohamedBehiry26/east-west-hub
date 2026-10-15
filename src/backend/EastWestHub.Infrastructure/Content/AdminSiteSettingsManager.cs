using Microsoft.EntityFrameworkCore;
using EastWestHub.Application.Content;
using EastWestHub.Domain.Entities;
using EastWestHub.Infrastructure.Persistence;

namespace EastWestHub.Infrastructure.Content;

public sealed class AdminSiteSettingsManager(EastWestHubDbContext db) : IAdminSiteSettingsManager
{
    public async Task<AdminSiteSettingsContent?> GetAsync(CancellationToken ct)
    {
        var setting = await db.SiteSettings.AsNoTracking().Include(x => x.SocialLinks).OrderBy(x => x.Id).FirstOrDefaultAsync(ct);
        return setting is null ? null : ToContent(setting);
    }

    public async Task<AdminSiteSettingsContent> SaveAsync(SaveAdminSiteSettings input, CancellationToken ct)
    {
        if (input.SocialLinks.GroupBy(link => link.Platform.Trim(), StringComparer.OrdinalIgnoreCase).Any(group => group.Count() > 1))
            throw new VideoAdministrationConflictException("Each social platform may appear only once.");
        var mp4 = ValidateMediaUrl(input.HeroMp4Url, true);
        var poster = ValidateMediaUrl(input.HeroPosterImageUrl, false);
        var heroId = string.IsNullOrWhiteSpace(input.HeroVideoUrl) ? null : AdminVideoManager.ExtractYouTubeVideoId(input.HeroVideoUrl);
        var setting = await db.SiteSettings.Include(x => x.SocialLinks).OrderBy(x => x.Id).FirstOrDefaultAsync(ct);
        if (setting is null)
        {
            setting = new SiteSetting { Id = 1, AgencyNameEn = input.AgencyNameEn.Trim(), AgencyNameAr = input.AgencyNameAr.Trim() };
            db.SiteSettings.Add(setting);
        }
        setting.AgencyNameEn = input.AgencyNameEn.Trim(); setting.AgencyNameAr = input.AgencyNameAr.Trim();
        setting.AgencyDescriptionEn = input.AgencyDescriptionEn; setting.AgencyDescriptionAr = input.AgencyDescriptionAr;
        // Older settings clients omit these optional fields; an explicit empty string clears them.
        if (input.HeroMp4Url is not null) setting.HeroMp4Url = mp4;
        if (input.HeroPosterImageUrl is not null) setting.HeroPosterImageUrl = poster;
        setting.HeroYouTubeVideoId = heroId; setting.LogoUrl = input.LogoUrl; setting.FaviconUrl = input.FaviconUrl;
        setting.Email = input.Email; setting.Phone = input.Phone;
        setting.AddressEn = input.AddressEn; setting.AddressAr = input.AddressAr;
        setting.DefaultSeoTitleEn = input.DefaultSeoTitleEn; setting.DefaultSeoTitleAr = input.DefaultSeoTitleAr;
        setting.DefaultSeoDescriptionEn = input.DefaultSeoDescriptionEn; setting.DefaultSeoDescriptionAr = input.DefaultSeoDescriptionAr;
        var selectedLinks = input.SocialLinks.Where(x => !string.IsNullOrWhiteSpace(x.Platform) && !string.IsNullOrWhiteSpace(x.Url)).ToArray();
        foreach (var existing in setting.SocialLinks.Where(link => !selectedLinks.Any(selected => selected.Platform.Trim().Equals(link.Platform, StringComparison.OrdinalIgnoreCase))).ToArray())
            setting.SocialLinks.Remove(existing);
        foreach (var link in input.SocialLinks.Where(x => !string.IsNullOrWhiteSpace(x.Platform) && !string.IsNullOrWhiteSpace(x.Url)))
        {
            var existing = setting.SocialLinks.FirstOrDefault(x => x.Platform.Equals(link.Platform.Trim(), StringComparison.OrdinalIgnoreCase));
            if (existing is null) { existing = new SocialLink { Platform = link.Platform.Trim(), Url = link.Url.Trim() }; setting.SocialLinks.Add(existing); }
            existing.Platform = link.Platform.Trim(); existing.Url = link.Url.Trim(); existing.DisplayOrder = link.DisplayOrder; existing.IsVisible = link.IsVisible;
        }
        await db.SaveChangesAsync(ct);
        return ToContent(setting);
    }

    private static string? ValidateMediaUrl(string? value, bool mp4)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var url=value.Trim();
        var local=url.StartsWith('/') && !url.StartsWith("//") && !url.Contains('\\');
        if (!Uri.TryCreate(local ? "https://local.invalid"+url : url, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps || !string.IsNullOrEmpty(uri.UserInfo)
            || (mp4 && !uri.AbsolutePath.EndsWith(".mp4", StringComparison.OrdinalIgnoreCase)))
            throw new VideoAdministrationConflictException(mp4 ? "Hero MP4 URL must be an HTTPS or site-relative .mp4 URL." : "Hero poster URL must be an HTTPS or site-relative image URL.");
        return url;
    }

    private static AdminSiteSettingsContent ToContent(SiteSetting x) => new(
        x.AgencyNameEn, x.AgencyNameAr, x.AgencyDescriptionEn, x.AgencyDescriptionAr,
        x.LogoUrl, x.FaviconUrl, x.Email, x.Phone, x.AddressEn, x.AddressAr,
        x.DefaultSeoTitleEn, x.DefaultSeoTitleAr, x.DefaultSeoDescriptionEn, x.DefaultSeoDescriptionAr,
        x.SocialLinks.OrderBy(link => link.DisplayOrder).Select(link => new AdminSocialLinkContent(link.Platform, link.Url, link.DisplayOrder, link.IsVisible)).ToArray(), x.HeroYouTubeVideoId is null ? null : $"https://www.youtube.com/watch?v={x.HeroYouTubeVideoId}", x.HeroMp4Url, x.HeroPosterImageUrl, x.Version);
}

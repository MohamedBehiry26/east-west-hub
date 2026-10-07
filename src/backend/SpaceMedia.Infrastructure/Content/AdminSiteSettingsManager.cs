using Microsoft.EntityFrameworkCore;
using SpaceMedia.Application.Content;
using SpaceMedia.Domain.Entities;
using SpaceMedia.Infrastructure.Persistence;

namespace SpaceMedia.Infrastructure.Content;

public sealed class AdminSiteSettingsManager(SpaceMediaDbContext db) : IAdminSiteSettingsManager
{
    public async Task<AdminSiteSettingsContent?> GetAsync(CancellationToken ct)
    {
        var setting = await db.SiteSettings.AsNoTracking().Include(x => x.SocialLinks).OrderBy(x => x.Id).FirstOrDefaultAsync(ct);
        return setting is null ? null : ToContent(setting);
    }

    public async Task<AdminSiteSettingsContent> SaveAsync(SaveAdminSiteSettings input, CancellationToken ct)
    {
        var setting = await db.SiteSettings.Include(x => x.SocialLinks).OrderBy(x => x.Id).FirstOrDefaultAsync(ct);
        if (setting is null)
        {
            setting = new SiteSetting { Id = 1, AgencyNameEn = input.AgencyNameEn.Trim(), AgencyNameAr = input.AgencyNameAr.Trim() };
            db.SiteSettings.Add(setting);
        }
        setting.AgencyNameEn = input.AgencyNameEn.Trim(); setting.AgencyNameAr = input.AgencyNameAr.Trim();
        setting.AgencyDescriptionEn = input.AgencyDescriptionEn; setting.AgencyDescriptionAr = input.AgencyDescriptionAr;
        setting.LogoUrl = input.LogoUrl; setting.FaviconUrl = input.FaviconUrl;
        setting.Email = input.Email; setting.Phone = input.Phone;
        setting.AddressEn = input.AddressEn; setting.AddressAr = input.AddressAr;
        setting.YouTubeChannelId = input.YouTubeChannelId;
        setting.DefaultSeoTitleEn = input.DefaultSeoTitleEn; setting.DefaultSeoTitleAr = input.DefaultSeoTitleAr;
        setting.DefaultSeoDescriptionEn = input.DefaultSeoDescriptionEn; setting.DefaultSeoDescriptionAr = input.DefaultSeoDescriptionAr;
        setting.SocialLinks.Clear();
        foreach (var link in input.SocialLinks.Where(x => !string.IsNullOrWhiteSpace(x.Platform) && !string.IsNullOrWhiteSpace(x.Url)))
            setting.SocialLinks.Add(new SocialLink { Platform = link.Platform.Trim(), Url = link.Url.Trim(), DisplayOrder = link.DisplayOrder, IsVisible = link.IsVisible });
        await db.SaveChangesAsync(ct);
        return ToContent(setting);
    }

    private static AdminSiteSettingsContent ToContent(SiteSetting x) => new(
        x.AgencyNameEn, x.AgencyNameAr, x.AgencyDescriptionEn, x.AgencyDescriptionAr,
        x.LogoUrl, x.FaviconUrl, x.Email, x.Phone, x.AddressEn, x.AddressAr,
        x.YouTubeChannelId, x.DefaultSeoTitleEn, x.DefaultSeoTitleAr, x.DefaultSeoDescriptionEn, x.DefaultSeoDescriptionAr,
        x.SocialLinks.OrderBy(link => link.DisplayOrder).Select(link => new AdminSocialLinkContent(link.Platform, link.Url, link.DisplayOrder, link.IsVisible)).ToArray());
}

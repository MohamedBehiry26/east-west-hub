namespace EastWestHub.Application.Content;

public sealed record AdminSocialLinkContent(string Platform, string Url, int DisplayOrder, bool IsVisible);
public sealed record SaveAdminSocialLink(string Platform, string Url, int DisplayOrder, bool IsVisible);

public sealed record AdminSiteSettingsContent(
    string AgencyNameEn, string AgencyNameAr, string? AgencyDescriptionEn, string? AgencyDescriptionAr,
    string? LogoUrl, string? FaviconUrl, string? Email, string? Phone, string? AddressEn, string? AddressAr,
    string? DefaultSeoTitleEn, string? DefaultSeoTitleAr, string? DefaultSeoDescriptionEn, string? DefaultSeoDescriptionAr,
    IReadOnlyList<AdminSocialLinkContent> SocialLinks, string? HeroVideoUrl = null, string? HeroMp4Url = null, string? HeroPosterImageUrl = null, Guid? Version = null, bool Exists = true);

public sealed record SaveAdminSiteSettings(
    string AgencyNameEn, string AgencyNameAr, string? AgencyDescriptionEn, string? AgencyDescriptionAr,
    string? LogoUrl, string? FaviconUrl, string? Email, string? Phone, string? AddressEn, string? AddressAr,
    string? DefaultSeoTitleEn, string? DefaultSeoTitleAr, string? DefaultSeoDescriptionEn, string? DefaultSeoDescriptionAr,
    IReadOnlyList<SaveAdminSocialLink> SocialLinks, string? HeroVideoUrl = null, string? HeroMp4Url = null, string? HeroPosterImageUrl = null);

public interface IAdminSiteSettingsManager { Task<AdminSiteSettingsContent?> GetAsync(CancellationToken ct); Task<AdminSiteSettingsContent> SaveAsync(SaveAdminSiteSettings input, CancellationToken ct); }

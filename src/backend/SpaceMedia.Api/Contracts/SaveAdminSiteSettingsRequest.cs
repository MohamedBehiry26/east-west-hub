using System.ComponentModel.DataAnnotations;
using SpaceMedia.Application.Content;

namespace SpaceMedia.Api.Contracts;

public sealed class SaveAdminSiteSettingsRequest
{
    [Required, StringLength(160)] public string AgencyNameEn { get; init; } = "";
    [Required, StringLength(160)] public string AgencyNameAr { get; init; } = "";
    [StringLength(2000)] public string? AgencyDescriptionEn { get; init; }
    [StringLength(2000)] public string? AgencyDescriptionAr { get; init; }
    [StringLength(2048)] public string? LogoUrl { get; init; }
    [StringLength(2048)] public string? FaviconUrl { get; init; }
    [EmailAddress, StringLength(320)] public string? Email { get; init; }
    [StringLength(40)] public string? Phone { get; init; }
    [StringLength(500)] public string? AddressEn { get; init; }
    [StringLength(500)] public string? AddressAr { get; init; }
    [StringLength(250)] public string? DefaultSeoTitleEn { get; init; }
    [StringLength(250)] public string? DefaultSeoTitleAr { get; init; }
    [StringLength(500)] public string? DefaultSeoDescriptionEn { get; init; }
    [StringLength(500)] public string? DefaultSeoDescriptionAr { get; init; }
    [StringLength(2048)] public string? HeroVideoUrl { get; init; }
    public List<SaveAdminSocialLinkRequest> SocialLinks { get; init; } = [];

    public SaveAdminSiteSettings ToModel() => new(AgencyNameEn.Trim(), AgencyNameAr.Trim(), AgencyDescriptionEn, AgencyDescriptionAr,
        LogoUrl, FaviconUrl, Email, Phone, AddressEn, AddressAr,
        DefaultSeoTitleEn, DefaultSeoTitleAr, DefaultSeoDescriptionEn, DefaultSeoDescriptionAr,
        (SocialLinks ?? []).Select(x => new SaveAdminSocialLink(x.Platform, x.Url, x.DisplayOrder, x.IsVisible)).ToArray(), HeroVideoUrl);
}

public sealed class SaveAdminSocialLinkRequest
{
    [Required, StringLength(40)] public string Platform { get; init; } = "";
    [Required, Url, StringLength(2048)] public string Url { get; init; } = "";
    public int DisplayOrder { get; init; }
    public bool IsVisible { get; init; } = true;
}


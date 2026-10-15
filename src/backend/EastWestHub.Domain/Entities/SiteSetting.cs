namespace EastWestHub.Domain.Entities;

public sealed class SiteSetting : AuditableEntity, ICmsVersioned
{
    public Guid Version { get; set; } = Guid.NewGuid();
    public int Id { get; set; }
    public required string AgencyNameEn { get; set; }
    public required string AgencyNameAr { get; set; }
    public string? AgencyDescriptionEn { get; set; }
    public string? AgencyDescriptionAr { get; set; }
    public string? LogoUrl { get; set; }
    public string? FaviconUrl { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? AddressEn { get; set; }
    public string? AddressAr { get; set; }
    public string? HeroMp4Url { get; set; }
    public string? HeroPosterImageUrl { get; set; }
    public string? HeroYouTubeVideoId { get; set; }
    public string? YouTubeChannelId { get; set; }
    public string? DefaultSeoTitleEn { get; set; }
    public string? DefaultSeoTitleAr { get; set; }
    public string? DefaultSeoDescriptionEn { get; set; }
    public string? DefaultSeoDescriptionAr { get; set; }
    public ICollection<SocialLink> SocialLinks { get; set; } = [];
}

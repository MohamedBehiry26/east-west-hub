namespace EastWestHub.Domain.Entities;

public sealed class SocialLink
{
    public Guid Id { get; set; }
    public int SiteSettingId { get; set; }
    public SiteSetting SiteSetting { get; set; } = null!;
    public required string Platform { get; set; }
    public required string Url { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsVisible { get; set; } = true;
}

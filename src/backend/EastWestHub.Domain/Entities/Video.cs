namespace EastWestHub.Domain.Entities;

public sealed class Video : AuditableEntity, ICmsVersioned
{
    public Guid Version { get; set; } = Guid.NewGuid();
    public Guid Id { get; set; }
    public string? YouTubeVideoId { get; set; }
    public string? YouTubeTitle { get; set; }
    public string? YouTubeDescription { get; set; }
    public MediaContentType ContentType { get; set; } = MediaContentType.Video;
    public required string TitleEn { get; set; }
    public required string TitleAr { get; set; }
    public required string SlugEn { get; set; }
    public required string SlugAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string? DescriptionAr { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? YouTubeThumbnailUrl { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public TimeSpan? Duration { get; set; }
    public int? EpisodeNumber { get; set; }
    public int? SeasonNumber { get; set; }
    public string? GuestNameEn { get; set; }
    public string? GuestNameAr { get; set; }
    public string? SeoTitleEn { get; set; }
    public string? SeoTitleAr { get; set; }
    public string? SeoDescriptionEn { get; set; }
    public string? SeoDescriptionAr { get; set; }
    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public bool IsFeatured { get; set; }
    public bool IsPublished { get; set; }
    public int DisplayOrder { get; set; }
    public ICollection<VideoTag> VideoTags { get; set; } = [];
}

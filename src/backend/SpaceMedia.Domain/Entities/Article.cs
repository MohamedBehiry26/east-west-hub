namespace SpaceMedia.Domain.Entities;

public sealed class Article : AuditableEntity
{
    public Guid Id { get; set; }
    public required string TitleEn { get; set; }
    public required string TitleAr { get; set; }
    public required string SlugEn { get; set; }
    public required string SlugAr { get; set; }
    public string? ExcerptEn { get; set; }
    public string? ExcerptAr { get; set; }
    public string? ContentEn { get; set; }
    public string? ContentAr { get; set; }
    public string? CoverImageUrl { get; set; }
    public Guid AuthorId { get; set; }
    public User Author { get; set; } = null!;
    public DateTimeOffset? PublishedAt { get; set; }
    public bool IsPublished { get; set; }
    public string? SeoTitleEn { get; set; }
    public string? SeoTitleAr { get; set; }
    public string? SeoDescriptionEn { get; set; }
    public string? SeoDescriptionAr { get; set; }
}

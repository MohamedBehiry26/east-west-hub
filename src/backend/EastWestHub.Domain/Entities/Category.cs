namespace EastWestHub.Domain.Entities;

public sealed class Category : AuditableEntity
{
    public Guid Id { get; set; }
    public required string NameEn { get; set; }
    public required string NameAr { get; set; }
    public required string SlugEn { get; set; }
    public required string SlugAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string? DescriptionAr { get; set; }
    public string? ImageUrl { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsPublished { get; set; }
    public string? SeoTitleEn { get; set; }
    public string? SeoTitleAr { get; set; }
    public string? SeoDescriptionEn { get; set; }
    public string? SeoDescriptionAr { get; set; }
    public ICollection<Video> Videos { get; set; } = [];
}

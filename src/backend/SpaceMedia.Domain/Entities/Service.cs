namespace SpaceMedia.Domain.Entities;

public sealed class Service : AuditableEntity
{
    public Guid Id { get; set; }
    public required string TitleEn { get; set; }
    public required string TitleAr { get; set; }
    public required string SlugEn { get; set; }
    public required string SlugAr { get; set; }
    public string? ShortDescriptionEn { get; set; }
    public string? ShortDescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string? DescriptionAr { get; set; }
    public string? FeaturesEn { get; set; }
    public string? FeaturesAr { get; set; }
    public string? ProcessEn { get; set; }
    public string? ProcessAr { get; set; }
    public string? ImageUrl { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsPublished { get; set; }
    public string? SeoTitleEn { get; set; }
    public string? SeoTitleAr { get; set; }
    public string? SeoDescriptionEn { get; set; }
    public string? SeoDescriptionAr { get; set; }
    public ICollection<ServicePortfolioProject> PortfolioProjects { get; set; } = [];
}

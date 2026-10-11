namespace EastWestHub.Domain.Entities;

public sealed class PortfolioProject : AuditableEntity
{
    public Guid Id { get; set; }
    public required string TitleEn { get; set; }
    public required string TitleAr { get; set; }
    public required string SlugEn { get; set; }
    public required string SlugAr { get; set; }
    public string? Client { get; set; }
    public string? CategoryEn { get; set; }
    public string? CategoryAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string? DescriptionAr { get; set; }
    public string? ChallengeEn { get; set; }
    public string? ChallengeAr { get; set; }
    public string? ApproachEn { get; set; }
    public string? ApproachAr { get; set; }
    public string? SolutionEn { get; set; }
    public string? SolutionAr { get; set; }
    public string? ResultsEn { get; set; }
    public string? ResultsAr { get; set; }
    public string? CoverImageUrl { get; set; }
    public DateOnly? ProjectDate { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsPublished { get; set; }
    public string? SeoTitleEn { get; set; }
    public string? SeoTitleAr { get; set; }
    public string? SeoDescriptionEn { get; set; }
    public string? SeoDescriptionAr { get; set; }
    public ICollection<PortfolioImage> Images { get; set; } = [];
    public ICollection<ServicePortfolioProject> ServicesUsed { get; set; } = [];
}

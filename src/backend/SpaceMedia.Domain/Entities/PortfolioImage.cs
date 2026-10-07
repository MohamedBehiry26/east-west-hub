namespace SpaceMedia.Domain.Entities;

public sealed class PortfolioImage
{
    public Guid Id { get; set; }
    public Guid PortfolioProjectId { get; set; }
    public PortfolioProject PortfolioProject { get; set; } = null!;
    public required string ImageUrl { get; set; }
    public string? AltTextEn { get; set; }
    public string? AltTextAr { get; set; }
    public int DisplayOrder { get; set; }
}

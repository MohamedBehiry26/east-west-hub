namespace SpaceMedia.Domain.Entities;

public sealed class ServicePortfolioProject
{
    public Guid ServiceId { get; set; }
    public Service Service { get; set; } = null!;
    public Guid PortfolioProjectId { get; set; }
    public PortfolioProject PortfolioProject { get; set; } = null!;
}

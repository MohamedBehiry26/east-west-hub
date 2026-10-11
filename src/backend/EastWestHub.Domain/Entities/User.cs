namespace EastWestHub.Domain.Entities;

public sealed class User : AuditableEntity
{
    public Guid Id { get; set; }
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
    public bool IsActive { get; set; } = true;
    public ICollection<Article> Articles { get; set; } = [];
}

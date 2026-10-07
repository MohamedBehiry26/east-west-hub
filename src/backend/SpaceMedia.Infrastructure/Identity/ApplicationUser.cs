using Microsoft.AspNetCore.Identity;

namespace SpaceMedia.Infrastructure.Identity;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public required string DisplayName { get; set; }
    public bool IsActive { get; set; } = true;
}

using Microsoft.AspNetCore.Identity;

namespace EastWestHub.Infrastructure.Identity;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public required string DisplayName { get; set; }
    public bool IsActive { get; set; } = true;
}

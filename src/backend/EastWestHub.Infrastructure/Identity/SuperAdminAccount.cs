using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace EastWestHub.Infrastructure.Identity;

// Operator-controlled binding to a pre-existing account. Never infer identity from submitted email or roles.
public sealed class SuperAdminAccount(IConfiguration configuration)
{
    public const string Policy = "ManageAdminAccounts";
    public const string OwnerEmail = "admin@gmail.com";
    public Guid? UserId
    {
        get
        {
            var value = configuration["SuperAdmin:UserId"];
            if (string.IsNullOrWhiteSpace(value)) return null;
            if (!Guid.TryParse(value, out var id) || id == Guid.Empty)
                throw new InvalidOperationException("SuperAdmin__UserId must identify the existing verified owner account.");
            return id;
        }
    }
    public async Task<bool> CanManageAsync(UserManager<ApplicationUser> users, ApplicationUser? user) =>
        UserId is { } id && user is not null && user.Id == id && user.IsActive && user.EmailConfirmed
        && string.Equals(user.Email, OwnerEmail, StringComparison.OrdinalIgnoreCase)
        && await users.IsInRoleAsync(user, AdminRoles.Administrator);

    public async Task ValidateExistingOwnerAsync(UserManager<ApplicationUser> users)
    {
        if (UserId is not { } id) return; // Fail closed: nobody can manage accounts until explicitly bound.
        if (!await CanManageAsync(users, await users.FindByIdAsync(id.ToString())))
            throw new InvalidOperationException("SuperAdmin__UserId must bind the existing active, email-confirmed admin@gmail.com administrator. No account is created or promoted automatically.");
    }
}

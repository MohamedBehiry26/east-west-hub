using Microsoft.AspNetCore.Identity;
using EastWestHub.Application.Authentication;

namespace EastWestHub.Infrastructure.Identity;

public sealed class AdminAuthService(
    SignInManager<ApplicationUser> signInManager,
    UserManager<ApplicationUser> userManager,
    JwtTokenGenerator tokenGenerator,
    SuperAdminAccount owner) : IAdminAuthService
{
    public async Task<AdminLoginResult?> LoginAsync(string email, string password)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is null || !user.IsActive)
        {
            return null;
        }

        var signInResult = await signInManager.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true);
        if (!signInResult.Succeeded)
        {
            return null;
        }

        var roles = await userManager.GetRolesAsync(user);
        if (!roles.Contains(AdminRoles.Administrator, StringComparer.Ordinal))
        {
            return null;
        }

        var (token, expiresAt) = tokenGenerator.CreateToken(user, roles);
        return new AdminLoginResult(token, expiresAt, user.Email!, user.DisplayName, await owner.CanManageAsync(userManager, user));
    }
}

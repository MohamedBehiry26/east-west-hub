using Microsoft.AspNetCore.Identity;
using SpaceMedia.Application.Authentication;

namespace SpaceMedia.Infrastructure.Identity;

public sealed class AdminAuthService(
    SignInManager<ApplicationUser> signInManager,
    UserManager<ApplicationUser> userManager,
    JwtTokenGenerator tokenGenerator) : IAdminAuthService
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
        return new AdminLoginResult(token, expiresAt, user.Email!, user.DisplayName);
    }
}

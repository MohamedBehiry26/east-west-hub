using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace SpaceMedia.Infrastructure.Identity;

public static class IdentityBootstrapper
{
    public static async Task EnsureAdminRoleAndOptionalUserAsync(
        IServiceProvider services,
        IConfiguration configuration)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        if (!await roleManager.RoleExistsAsync(AdminRoles.Administrator))
        {
            var roleResult = await roleManager.CreateAsync(new IdentityRole<Guid>(AdminRoles.Administrator));
            EnsureSuccess(roleResult, "Could not create the Admin role.");
        }

        var email = configuration["AdminBootstrap:Email"];
        var password = configuration["AdminBootstrap:Password"];
        if (string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Set both AdminBootstrap__Email and AdminBootstrap__Password, or leave both unset.");
        }

        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = "East West Hub Administrator"
            };

            var createResult = await userManager.CreateAsync(user, password);
            EnsureSuccess(createResult, "Could not create the bootstrap administrator.");
        }

        if (!await userManager.IsInRoleAsync(user, AdminRoles.Administrator))
        {
            var addRoleResult = await userManager.AddToRoleAsync(user, AdminRoles.Administrator);
            EnsureSuccess(addRoleResult, "Could not grant the Admin role to the bootstrap user.");
        }
    }

    private static void EnsureSuccess(IdentityResult result, string message)
    {
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(error => error.Code));
            throw new InvalidOperationException($"{message} Identity errors: {errors}");
        }
    }
}

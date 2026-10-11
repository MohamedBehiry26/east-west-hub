using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.ComponentModel.DataAnnotations;

namespace EastWestHub.Infrastructure.Identity;

public static class IdentityBootstrapper
{
    public static async Task EnsureAdminRoleAndOptionalUserAsync(
        IServiceProvider services,
        IConfiguration configuration)
    {
        var email = configuration["AdminBootstrap:Email"];
        var password = configuration["AdminBootstrap:Password"];
        if (string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(password))
        {
            await EnsureAdminRoleAsync(services);
            return;
        }

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            throw new InvalidOperationException(
                "Set both AdminBootstrap__Email and AdminBootstrap__Password, or leave both unset.");
        }

        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        if (!new EmailAddressAttribute().IsValid(email))
        {
            throw new InvalidOperationException("AdminBootstrap__Email must be a valid email address.");
        }
        var candidate = new ApplicationUser
        {
            Id = Guid.NewGuid(), UserName = email, Email = email,
            EmailConfirmed = true, DisplayName = "East West Hub Administrator"
        };
        // Validate configured credentials before any role/account writes. Never echo inputs.
        foreach (var validator in userManager.PasswordValidators)
        {
            var validation = await validator.ValidateAsync(userManager, candidate, password);
            EnsureSuccess(validation,
                $"AdminBootstrap__Password does not meet the Identity password policy: at least {userManager.Options.Password.RequiredLength} characters, uppercase, lowercase, digit and symbol.");
        }
        await EnsureAdminRoleAsync(services);
        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            user = candidate;

            var createResult = await userManager.CreateAsync(user, password);
            EnsureSuccess(createResult, "Could not create the bootstrap administrator.");
        }

        if (!await userManager.IsInRoleAsync(user, AdminRoles.Administrator))
        {
            var addRoleResult = await userManager.AddToRoleAsync(user, AdminRoles.Administrator);
            EnsureSuccess(addRoleResult, "Could not grant the Admin role to the bootstrap user.");
        }
    }

    private static async Task EnsureAdminRoleAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        if (!await roleManager.RoleExistsAsync(AdminRoles.Administrator))
        {
            var result = await roleManager.CreateAsync(new IdentityRole<Guid>(AdminRoles.Administrator));
            EnsureSuccess(result, "Could not create the Admin role.");
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

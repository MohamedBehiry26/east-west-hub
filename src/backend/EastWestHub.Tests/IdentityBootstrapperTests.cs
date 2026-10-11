using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using EastWestHub.Infrastructure.Identity;
using EastWestHub.Infrastructure.Persistence;
using Xunit;

namespace EastWestHub.Tests;

public sealed class IdentityBootstrapperTests
{
    private static ServiceProvider Services()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<EastWestHubDbContext>(options => options.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        services.AddIdentityCore<ApplicationUser>(options => {
            options.User.RequireUniqueEmail = true;
            options.Password.RequiredLength = 12;
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
        }).AddRoles<IdentityRole<Guid>>().AddEntityFrameworkStores<EastWestHubDbContext>();
        return services.BuildServiceProvider();
    }
    private static IConfiguration Settings(string? email, string? password) => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?> { ["AdminBootstrap:Email"] = email, ["AdminBootstrap:Password"] = password }).Build();

    [Theory]
    [InlineData("short")]
    [InlineData("onlylowercasepassword")]
    [InlineData("NoDigitsOrSymbolHere")]
    public async Task Invalid_password_reports_policy_without_sensitive_values_or_writes(string password)
    {
        using var services = Services(); using var scope = services.CreateScope();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => IdentityBootstrapper.EnsureAdminRoleAndOptionalUserAsync(scope.ServiceProvider, Settings("bootstrap@example.test", password)));
        Assert.Contains("AdminBootstrap__Password", error.Message);
        Assert.Contains("at least 12 characters", error.Message);
        Assert.DoesNotContain(password, error.Message); Assert.DoesNotContain("bootstrap@example.test", error.Message);
        var db = scope.ServiceProvider.GetRequiredService<EastWestHubDbContext>();
        Assert.Empty(db.Users); Assert.Empty(db.Roles);
    }

    [Theory]
    [InlineData("invalid-address", "StrongTestPassword!234", "valid email")]
    [InlineData("bootstrap@example.test", null, "Set both")]
    [InlineData(null, "StrongTestPassword!234", "Set both")]
    public async Task Invalid_configuration_fails_before_identity_writes(string? email, string? password, string message)
    {
        using var services = Services(); using var scope = services.CreateScope();
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => IdentityBootstrapper.EnsureAdminRoleAndOptionalUserAsync(scope.ServiceProvider, Settings(email, password)));
        Assert.Contains(message, error.Message);
        if (email is not null) Assert.DoesNotContain(email, error.Message);
        if (password is not null) Assert.DoesNotContain(password, error.Message);
        Assert.Empty(scope.ServiceProvider.GetRequiredService<EastWestHubDbContext>().Roles);
    }

    [Fact]
    public async Task Bootstrap_is_idempotent_and_does_not_reset_existing_passwords()
    {
        using var services = Services(); using var scope = services.CreateScope();
        await IdentityBootstrapper.EnsureAdminRoleAndOptionalUserAsync(scope.ServiceProvider, Settings("bootstrap@example.test", "StrongTestPassword!234"));
        await IdentityBootstrapper.EnsureAdminRoleAndOptionalUserAsync(scope.ServiceProvider, Settings("bootstrap@example.test", "OtherStrongPassword!567"));
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = Assert.Single(users.Users);
        Assert.True(await users.CheckPasswordAsync(user, "StrongTestPassword!234"));
        Assert.False(await users.CheckPasswordAsync(user, "OtherStrongPassword!567"));
        Assert.True(await users.IsInRoleAsync(user, AdminRoles.Administrator));
        Assert.True(user.EmailConfirmed);
    }

    [Fact]
    public async Task Unconfigured_bootstrap_creates_only_the_admin_role()
    {
        using var services = Services(); using var scope = services.CreateScope();
        await IdentityBootstrapper.EnsureAdminRoleAndOptionalUserAsync(scope.ServiceProvider, Settings(null, null));
        var db = scope.ServiceProvider.GetRequiredService<EastWestHubDbContext>();
        Assert.Empty(db.Users); Assert.Single(db.Roles);
    }
}

using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using EastWestHub.Api.Controllers;
using EastWestHub.Infrastructure.Identity;
using EastWestHub.Infrastructure.Persistence;
using Xunit;

namespace EastWestHub.Tests;

public sealed class AdminAccountsTests
{
    [Fact]
    public async Task New_account_can_authenticate_and_has_admin_role_without_exposing_password()
    {
        using var services = BuildServices();
        await using var scope = services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var controller = Controller(scope.ServiceProvider);
        var request = new CreateAdminAccountRequest { Email = "new@example.test", DisplayName = "New Admin", Password = "StrongPassword!234" };
        var response = Assert.IsType<ObjectResult>(await controller.Create(request));
        Assert.Equal(201, response.StatusCode);
        Assert.DoesNotContain("Password", System.Text.Json.JsonSerializer.Serialize(response.Value));
        var user = await users.FindByEmailAsync(request.Email);
        Assert.NotNull(user);
        Assert.True(user.EmailConfirmed);
        Assert.True(await users.CheckPasswordAsync(user, request.Password));
        Assert.True(await users.IsInRoleAsync(user, AdminRoles.Administrator));
        Assert.NotEqual(request.Password, user.PasswordHash);
        Assert.IsType<ConflictObjectResult>(await controller.Create(request));
        Assert.Equal(1, await users.Users.CountAsync());
    }

    [Fact]
    public async Task Weak_password_does_not_create_an_account()
    {
        using var services = BuildServices();
        await using var scope = services.CreateAsyncScope();
        var response = await Controller(scope.ServiceProvider).Create(new CreateAdminAccountRequest { Email = "weak@example.test", DisplayName = "Weak", Password = "onlylowercase" });
        Assert.IsType<BadRequestObjectResult>(response);
        Assert.Empty(scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>().Users);
    }

    [Fact]
    public async Task Account_creation_requires_an_authenticated_administrator()
    {
        await using var factory = new ReleaseGateHttpTests.TestApiFactory();
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsync("/api/admin/accounts", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"))).StatusCode);
        using var scope = factory.Services.CreateScope();
        var token = scope.ServiceProvider.GetRequiredService<JwtTokenGenerator>().CreateToken(new ApplicationUser { Id = Guid.NewGuid(), Email = "reader@example.test", DisplayName = "Reader" }, []).Token;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsync("/api/admin/accounts", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"))).StatusCode);
    }

    private static ServiceProvider BuildServices()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<EastWestHubDbContext>(options => options.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        services.AddIdentityCore<ApplicationUser>(options => { options.User.RequireUniqueEmail = true; options.Password.RequiredLength = 12; })
            .AddRoles<IdentityRole<Guid>>().AddEntityFrameworkStores<EastWestHubDbContext>();
        return services.BuildServiceProvider();
    }
    private static AdminAccountsController Controller(IServiceProvider services) => new(services.GetRequiredService<UserManager<ApplicationUser>>(), services.GetRequiredService<RoleManager<IdentityRole<Guid>>>(), services.GetRequiredService<EastWestHubDbContext>(), new SuperAdminAccount(new Microsoft.Extensions.Configuration.ConfigurationBuilder().Build()));
}
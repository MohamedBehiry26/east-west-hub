using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Identity;
using EastWestHub.Infrastructure.Identity;
using EastWestHub.Infrastructure.Persistence;
using Xunit;

namespace EastWestHub.Tests;

public sealed class AdminAccountLifecycleTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Owner_can_change_status_without_changing_credentials_roles_or_profile(bool initiallyActive)
    {
        await using var suite = new Suite(); using var client=suite.Client();
        await suite.SetActive(initiallyActive);
        var before=await suite.Snapshot();
        var response=initiallyActive ? await client.DeleteAsync(suite.Url) : await client.PostAsync(suite.Url+"/reactivate", null);
        Assert.Equal(HttpStatusCode.NoContent,response.StatusCode);
        var after=await suite.Snapshot();
        Assert.Equal(before with { Active=!initiallyActive },after);
        Assert.Equal(HttpStatusCode.NoContent,(await client.PostAsync(suite.Url+"/reactivate",null)).StatusCode);
        Assert.True((await suite.Snapshot()).Active);
    }
    [Theory]
    [InlineData("anonymous",false,401)] [InlineData("anonymous",true,401)]
    [InlineData("admin",false,403)] [InlineData("admin",true,403)]
    [InlineData("reader",false,403)] [InlineData("reader",true,403)]
    [InlineData("fake-owner",false,403)] [InlineData("fake-owner",true,403)]
    public async Task Real_authorization_rejects_non_owners(string identity,bool activate,int expected)
    {
        await using var suite=new Suite();using var client=suite.Client(identity);
        var before=await suite.Snapshot();
        var response=activate ? await client.PostAsync(suite.Url+"/reactivate",null) : await client.DeleteAsync(suite.Url);
        Assert.Equal((HttpStatusCode)expected,response.StatusCode);Assert.Equal(before,await suite.Snapshot());
    }
    [Fact]
    public async Task Owner_is_protected_and_unknown_or_non_admin_targets_are_not_changed()
    {
        await using var suite=new Suite();using var client=suite.Client();
        Assert.Equal(HttpStatusCode.Conflict,(await client.DeleteAsync("/api/admin/accounts/"+suite.OwnerId)).StatusCode);
        foreach(var id in new[]{Guid.NewGuid(),suite.ReaderId})
            Assert.Equal(HttpStatusCode.NotFound,(await client.PostAsync($"/api/admin/accounts/{id}/reactivate",null)).StatusCode);
    }
    private sealed record State(bool Active,string? Password,string? SecurityStamp,string? Email,string? Name,bool Confirmed,string Roles);
    private sealed class Suite : IAsyncDisposable
    {
        public Guid OwnerId {get;}=Guid.NewGuid(); public Guid ReaderId {get;}=Guid.NewGuid();
        private Guid TargetId {get;}=Guid.NewGuid(); private readonly string database=Guid.NewGuid().ToString();
        private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program> host;
        public string Url=>"/api/admin/accounts/"+TargetId;
        public Suite()
        {
            host=new ReleaseGateHttpTests.TestApiFactory().WithWebHostBuilder(builder=>builder.ConfigureTestServices(services=>{
                services.RemoveAll<DbContextOptions<EastWestHubDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<EastWestHubDbContext>>();
                services.AddDbContext<EastWestHubDbContext>(o=>o.UseInMemoryDatabase(database));
                services.AddSingleton(new SuperAdminAccount(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>{{"SuperAdmin:UserId",OwnerId.ToString()}}).Build()));
            }));
        }
        private bool seeded;
        private void Seed()
        {
            if(seeded)return;using var scope=host.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<EastWestHubDbContext>();
            Assert.Equal("Microsoft.EntityFrameworkCore.InMemory",db.Database.ProviderName);
            var role=new IdentityRole<Guid>("Admin"){Id=Guid.NewGuid(),NormalizedName="ADMIN"};db.Roles.Add(role);
            db.Users.AddRange(new ApplicationUser{Id=OwnerId,UserName="owner",Email=SuperAdminAccount.OwnerEmail,DisplayName="Owner",EmailConfirmed=true},new ApplicationUser{Id=TargetId,UserName="target",Email="target@example.test",DisplayName="Target",EmailConfirmed=true,IsActive=false,PasswordHash="existing-hash",SecurityStamp="existing-stamp"},new ApplicationUser{Id=ReaderId,UserName="reader",Email="reader@example.test",DisplayName="Reader",EmailConfirmed=true});
            db.UserRoles.AddRange(new IdentityUserRole<Guid>{UserId=OwnerId,RoleId=role.Id},new IdentityUserRole<Guid>{UserId=TargetId,RoleId=role.Id});db.SaveChanges();seeded=true;
        }
        public HttpClient Client(string identity="owner")
        {
            var client=host.CreateClient();Seed();
            using var scope=host.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<EastWestHubDbContext>();
            // A regular, active Admin is distinct from the configured Owner.
            if(identity is "admin" or "fake-owner") {var target=db.Users.Find(TargetId)!;target.IsActive=true;db.SaveChanges();}
            if(identity!="anonymous"){
                var user=db.Users.Find(identity=="owner"?OwnerId:identity=="reader"?ReaderId:TargetId)!;
                string[] roles=identity=="reader"?[]:identity=="fake-owner"?["Admin","Owner","SuperAdmin"]:["Admin"];
                var token=scope.ServiceProvider.GetRequiredService<JwtTokenGenerator>().CreateToken(user,roles).Token;
                client.DefaultRequestHeaders.Authorization=new AuthenticationHeaderValue("Bearer",token);
            }return client;
        }
        public async Task SetActive(bool active){using var scope=host.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<EastWestHubDbContext>();var user=await db.Users.FindAsync(TargetId);user!.IsActive=active;await db.SaveChangesAsync();}
        public async Task<State> Snapshot(){using var scope=host.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<EastWestHubDbContext>();var user=await db.Users.FindAsync(TargetId);return new(user!.IsActive,user.PasswordHash,user.SecurityStamp,user.Email,user.DisplayName,user.EmailConfirmed,string.Join(",",await db.UserRoles.Where(r=>r.UserId==TargetId).Select(r=>r.RoleId).ToListAsync()));}
        public ValueTask DisposeAsync()=>host.DisposeAsync();
    }
}

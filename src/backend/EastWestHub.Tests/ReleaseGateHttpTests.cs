using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace EastWestHub.Tests;

public sealed class ReleaseGateHttpTests : IClassFixture<ReleaseGateHttpTests.TestApiFactory>
{
    private const string SigningKey = "release-gate-isolated-signing-key-at-least-thirty-two-bytes";
    private const string Issuer = "https://issuer.test";
    private const string Audience = "east-west-hub-tests";
    private readonly TestApiFactory _factory;

    public ReleaseGateHttpTests(TestApiFactory factory) => _factory = factory;

    [Theory]
    [InlineData(null)]
    [InlineData("Bearer malformed.token.value")]
    public async Task Protected_endpoints_reject_missing_and_malformed_tokens(string? authorization)
    {
        using var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/admin/session");
        if (authorization is not null) request.Headers.TryAddWithoutValidation("Authorization", authorization);

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(TokenVariant.InvalidSignature)]
    [InlineData(TokenVariant.Expired)]
    [InlineData(TokenVariant.WrongIssuer)]
    [InlineData(TokenVariant.WrongAudience)]
    public async Task Protected_endpoint_rejects_invalid_JWT_contracts(TokenVariant variant)
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken(variant, isAdmin: true));

        var response = await client.GetAsync("/api/admin/session");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Admin_session_accepts_valid_administrator_JWT()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken(TokenVariant.Valid, isAdmin: true));

        var response = await client.GetAsync("/api/admin/session");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/admin/videos")]
    [InlineData("/api/admin/categories")]
    [InlineData("/api/admin/services")]
    [InlineData("/api/admin/portfolio")]
    [InlineData("/api/admin/articles")]
    [InlineData("/api/admin/settings")]
    public async Task Non_administrator_is_forbidden_from_representative_admin_endpoints(string path)
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken(TokenVariant.Valid, isAdmin: false));

        var response = await client.GetAsync(path);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData("POST", "/api/admin/categories")]
    [InlineData("PUT", "/api/admin/videos/11111111-1111-1111-1111-111111111111")]
    [InlineData("DELETE", "/api/admin/services/11111111-1111-1111-1111-111111111111")]
    [InlineData("POST", "/api/admin/articles")]
    public async Task Anonymous_and_non_administrator_writes_are_rejected_before_persistence(string method, string path)
    {
        using var anonymous = _factory.CreateClient();
        using var anonymousRequest = new HttpRequestMessage(new HttpMethod(method), path) { Content = new StringContent("{}", Encoding.UTF8, "application/json") };
        var anonymousResponse = await anonymous.SendAsync(anonymousRequest);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymousResponse.StatusCode);

        using var nonAdmin = _factory.CreateClient();
        nonAdmin.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken(TokenVariant.Valid, isAdmin: false));
        using var nonAdminRequest = new HttpRequestMessage(new HttpMethod(method), path) { Content = new StringContent("{}", Encoding.UTF8, "application/json") };
        var nonAdminResponse = await nonAdmin.SendAsync(nonAdminRequest);
        Assert.Equal(HttpStatusCode.Forbidden, nonAdminResponse.StatusCode);
    }

    [Fact]
    public async Task CORS_allows_the_configured_origin_and_authorization_preflight()
    {
        using var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/admin/session");
        request.Headers.Add("Origin", "https://allowed.example.test");
        request.Headers.Add("Access-Control-Request-Method", "GET");
        request.Headers.Add("Access-Control-Request-Headers", "authorization");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("https://allowed.example.test", response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.Contains("authorization", response.Headers.GetValues("Access-Control-Allow-Headers").Single(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CORS_does_not_allow_an_unconfigured_origin()
    {
        using var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/api/admin/session");
        request.Headers.Add("Origin", "https://untrusted.example.test");
        request.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await client.SendAsync(request);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task API_emits_security_headers_and_anonymous_health_response()
    {
        using var client = _factory.CreateClient();
        var response = await client.GetAsync("/health");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("strict-origin-when-cross-origin", response.Headers.GetValues("Referrer-Policy").Single());
        Assert.Contains("default-src 'none'", response.Headers.GetValues("Content-Security-Policy").Single());
        Assert.DoesNotContain("connection", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Invalid_JSON_returns_a_safe_validation_response()
    {
        using var client = _factory.CreateClient();
        using var content = new StringContent("{", Encoding.UTF8, "application/json");

        var response = await client.PostAsync("/api/auth/login", content);
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.DoesNotContain(SigningKey, body, StringComparison.Ordinal);
        Assert.DoesNotContain("StackTrace", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("System.", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_rate_limit_returns_429_after_the_configured_threshold()
    {
        await using var isolatedFactory = new TestApiFactory();
        using var client = isolatedFactory.CreateClient();
        HttpResponseMessage? response = null;

        for (var index = 0; index < 11; index++)
        {
            response?.Dispose();
            response = await client.PostAsync("/api/auth/login", new StringContent("{}", Encoding.UTF8, "application/json"));
            if (index < 10) Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, response!.StatusCode);
        response.Dispose();
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("PUT")]
    public async Task Settings_routes_require_admin_authorization(string method)
    {
        using var client = _factory.CreateClient();
        using var anonymous = new HttpRequestMessage(new HttpMethod(method), "/api/admin/settings");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(anonymous)).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken(TokenVariant.Valid, false));
        using var ordinary = new HttpRequestMessage(new HttpMethod(method), "/api/admin/settings");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(ordinary)).StatusCode);
    }

    [Fact]
    public async Task Empty_settings_GET_is_read_only_and_PUT_creates_then_updates_the_same_record()
    {
        await using var db = new EastWestHub.Infrastructure.Persistence.EastWestHubDbContext(
            new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<EastWestHub.Infrastructure.Persistence.EastWestHubDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        using var factory = _factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.AddSingleton<EastWestHub.Application.Content.IAdminSiteSettingsManager>(
                new EastWestHub.Infrastructure.Content.AdminSiteSettingsManager(db))));
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", CreateToken(TokenVariant.Valid, true));
        var empty = await client.GetAsync("/api/admin/settings");
        Assert.Equal(HttpStatusCode.OK, empty.StatusCode);
        var draft = await empty.Content.ReadFromJsonAsync<EastWestHub.Application.Content.AdminSiteSettingsContent>();
        Assert.Equal("", draft!.AgencyNameEn); Assert.Empty(draft.SocialLinks);
        Assert.Empty(db.SiteSettings); Assert.Empty(db.SocialLinks);
        var input = new { agencyNameEn = "Owner supplied", agencyNameAr = "اسم المالك", socialLinks = Array.Empty<object>() };
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/admin/settings", input)).StatusCode);
        var id = Assert.Single(db.SiteSettings).Id;
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/admin/settings", input with { agencyNameEn = "Updated" })).StatusCode);
        Assert.Equal(id, Assert.Single(db.SiteSettings).Id);
        var saved = await client.GetFromJsonAsync<EastWestHub.Application.Content.AdminSiteSettingsContent>("/api/admin/settings");
        Assert.Equal("Updated", saved!.AgencyNameEn);
    }

    private static string CreateToken(TokenVariant variant, bool isAdmin)
    {
        var key = variant == TokenVariant.InvalidSignature ? "another-valid-but-different-signing-key-32-plus" : SigningKey;
        var issuer = variant == TokenVariant.WrongIssuer ? "https://wrong-issuer.test" : Issuer;
        var audience = variant == TokenVariant.WrongAudience ? "wrong-audience" : Audience;
        var expires = variant == TokenVariant.Expired ? DateTime.UtcNow.AddMinutes(-2) : DateTime.UtcNow.AddMinutes(5);
        var notBefore = variant == TokenVariant.Expired ? DateTime.UtcNow.AddMinutes(-5) : DateTime.UtcNow.AddMinutes(-1);
        var claims = new List<Claim> { new(ClaimTypes.Email, "release.gate@example.test"), new(ClaimTypes.Name, "Release Gate") };
        if (isAdmin) claims.Add(new Claim(ClaimTypes.Role, "Admin"));

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            notBefore: notBefore,
            expires: expires,
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public enum TokenVariant { Valid, InvalidSignature, Expired, WrongIssuer, WrongAudience }

    public sealed class TestApiFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            var settings = new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=127.0.0.1;Port=1;Database=isolated_test;Username=ignored;Password=ignored",
                ["Jwt:Key"] = SigningKey,
                ["Jwt:Issuer"] = Issuer,
                ["Jwt:Audience"] = Audience,
                ["Jwt:AccessTokenMinutes"] = "15",
                ["AllowedOrigins:0"] = "https://allowed.example.test",
                ["AllowedHosts"] = "localhost",
                ["PublicSite:BaseUrl"] = "https://site.example.test",
                ["Testing:SkipStartupDataInitialization"] = "true"
            };
            foreach (var (key, value) in settings)
            {
                builder.UseSetting(key, value);
            }
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(settings));
        }
    }
}

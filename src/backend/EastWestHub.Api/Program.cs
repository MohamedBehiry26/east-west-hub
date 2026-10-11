using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Threading.RateLimiting;
using EastWestHub.Application;
using EastWestHub.Infrastructure;
using EastWestHub.Infrastructure.Identity;
using EastWestHub.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 1_048_576);
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("admin-login", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown-client",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(5),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
});
var signingKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(signingKey))
{
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException("Jwt__Key must be configured outside Development.");
    }

    signingKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
    Console.Error.WriteLine("Jwt:Key is unset; using an ephemeral Development-only signing key.");
}

if (Encoding.UTF8.GetByteCount(signingKey) < 32)
{
    throw new InvalidOperationException("Jwt__Key must contain at least 32 UTF-8 bytes.");
}

var jwtSettings = new JwtTokenSettings(
    builder.Configuration["Jwt:Issuer"] ?? "EastWestHub.Api",
    builder.Configuration["Jwt:Audience"] ?? "EastWestHub.Admin",
    signingKey,
    builder.Configuration.GetValue("Jwt:AccessTokenMinutes", 15));
if (jwtSettings.LifetimeMinutes is < 1 or > 60)
{
    throw new InvalidOperationException("Jwt:AccessTokenMinutes must be between 1 and 60.");
}
builder.Services.AddSingleton(jwtSettings);
builder.Services.AddSingleton<JwtTokenGenerator>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});
builder.Services.AddCors(options => options.AddPolicy("Frontend", policy =>
{
    var origins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
    if (origins.Length > 0)
    {
        policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
    }
}));

if (!builder.Environment.IsDevelopment())
{
    var allowedHosts = builder.Configuration["AllowedHosts"];
    if (string.IsNullOrWhiteSpace(allowedHosts) || allowedHosts.Trim() == "*")
    {
        throw new InvalidOperationException("Configure a non-wildcard AllowedHosts value outside Development.");
    }

    var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? [];
    if (allowedOrigins.Length == 0 || allowedOrigins.Any(origin =>
            !Uri.TryCreate(origin, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps || uri.AbsolutePath != "/"))
    {
        throw new InvalidOperationException("Configure AllowedOrigins with one or more HTTPS website origins outside Development.");
    }

    var publicSiteBaseUrl = builder.Configuration["PublicSite:BaseUrl"];
    if (!Uri.TryCreate(publicSiteBaseUrl, UriKind.Absolute, out var publicSiteUri)
        || publicSiteUri.Scheme != Uri.UriSchemeHttps
        || publicSiteUri.AbsolutePath != "/")
    {
        throw new InvalidOperationException("Configure PublicSite__BaseUrl as the HTTPS public website origin outside Development.");
    }
}

builder.Services.AddResponseCaching();
var app = builder.Build();
var skipStartupDataInitialization = app.Environment.IsEnvironment("Testing")
    && builder.Configuration.GetValue("Testing:SkipStartupDataInitialization", false);
app.UseExceptionHandler();
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
    context.Response.Headers["X-Permitted-Cross-Domain-Policies"] = "none";
    await next();
});
if (!skipStartupDataInitialization
    && app.Environment.IsDevelopment()
    && !string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("DefaultConnection")))
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<EastWestHubDbContext>();
    await dbContext.Database.MigrateAsync();
    if (app.Environment.IsDevelopment() && builder.Configuration.GetValue<bool>("Development:SeedDemoContent"))
    {
        await DevelopmentSeeder.SeedAsync(dbContext, app.Environment.EnvironmentName);
    }
}
if (!skipStartupDataInitialization
    && !string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("DefaultConnection")))
{
    await using var scope = app.Services.CreateAsyncScope();
    await IdentityBootstrapper.EnsureAdminRoleAndOptionalUserAsync(scope.ServiceProvider, builder.Configuration);
}

app.UseRouting();
app.UseRateLimiter();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseResponseCaching();
app.MapHealthChecks("/health").AllowAnonymous();
app.MapControllers();
app.Run();

public partial class Program { }

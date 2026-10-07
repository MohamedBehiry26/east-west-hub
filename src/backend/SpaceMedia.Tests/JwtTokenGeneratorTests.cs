using System.Security.Claims;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using SpaceMedia.Infrastructure.Identity;
using Xunit;

namespace SpaceMedia.Tests;

public sealed class JwtTokenGeneratorTests
{
    [Fact]
    public void CreateToken_issues_signed_token_with_admin_role_and_configured_expiry()
    {
        var settings = new JwtTokenSettings("issuer", "audience", new string('k', 48), 15);
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "admin@example.com",
            Email = "admin@example.com",
            DisplayName = "Agency Admin"
        };

        var (token, expiresAt) = new JwtTokenGenerator(settings)
            .CreateToken(user, [AdminRoles.Administrator]);

        var validation = new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = settings.Issuer,
            ValidateAudience = true,
            ValidAudience = settings.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(2),
            RoleClaimType = ClaimTypes.Role
        }, out var parsed);

        Assert.Equal(user.Id.ToString(), validation.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.Equal(user.Email, validation.FindFirst(ClaimTypes.Email)?.Value);
        Assert.Contains(AdminRoles.Administrator, validation.FindAll(ClaimTypes.Role).Select(claim => claim.Value));
        var remainingLifetime = expiresAt - DateTimeOffset.UtcNow;
        Assert.InRange(remainingLifetime, TimeSpan.FromMinutes(15) - TimeSpan.FromSeconds(2), TimeSpan.FromMinutes(15));
        Assert.InRange((parsed.ValidTo - expiresAt.UtcDateTime).Duration(), TimeSpan.Zero, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void Expired_jwt_is_rejected()
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(new string('k', 48)));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var now = DateTime.UtcNow;
        var expiredToken = new JwtSecurityToken(
            issuer: "issuer", audience: "audience", claims: [],
            notBefore: now.AddHours(-2), expires: now.AddHours(-1), signingCredentials: credentials);
        var serialized = new JwtSecurityTokenHandler().WriteToken(expiredToken);
        var validation = new TokenValidationParameters
        {
            ValidateIssuer = true, ValidIssuer = "issuer",
            ValidateAudience = true, ValidAudience = "audience",
            ValidateIssuerSigningKey = true, IssuerSigningKey = key,
            ValidateLifetime = true, ClockSkew = TimeSpan.Zero
        };

        Assert.Throws<SecurityTokenExpiredException>(() => new JwtSecurityTokenHandler().ValidateToken(serialized, validation, out _));
    }
}

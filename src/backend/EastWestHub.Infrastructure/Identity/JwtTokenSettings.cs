namespace EastWestHub.Infrastructure.Identity;

public sealed record JwtTokenSettings(string Issuer, string Audience, string SigningKey, int LifetimeMinutes);

namespace EastWestHub.Application.Authentication;

public sealed record AdminLoginResult(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    string Email,
    string DisplayName);

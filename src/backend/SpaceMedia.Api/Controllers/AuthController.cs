using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SpaceMedia.Api.Contracts;
using SpaceMedia.Application.Authentication;

namespace SpaceMedia.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/auth")]
public sealed class AuthController(IAdminAuthService authService) : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting("admin-login")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        Response.Headers.CacheControl = "no-store, no-cache";
        Response.Headers.Pragma = "no-cache";
        var result = await authService.LoginAsync(request.Email, request.Password);
        if (result is null)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(new
        {
            accessToken = result.AccessToken,
            tokenType = "Bearer",
            expiresAt = result.ExpiresAt,
            user = new { email = result.Email, displayName = result.DisplayName }
        });
    }
}

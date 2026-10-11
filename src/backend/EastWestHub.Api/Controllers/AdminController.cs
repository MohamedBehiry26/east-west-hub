using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EastWestHub.Infrastructure.Identity;

namespace EastWestHub.Api.Controllers;

[ApiController]
[Authorize(Roles = AdminRoles.Administrator)]
[Route("api/admin")]
public sealed class AdminController : ControllerBase
{
    [HttpGet("session")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public IActionResult GetSession() => Ok(new
    {
        email = User.FindFirstValue(ClaimTypes.Email),
        displayName = User.FindFirstValue(ClaimTypes.Name)
    });
}

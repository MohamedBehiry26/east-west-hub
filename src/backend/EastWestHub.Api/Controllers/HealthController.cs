using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace EastWestHub.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Get() => Ok(new { status = "ok", service = "east-west-hub-api" });
}

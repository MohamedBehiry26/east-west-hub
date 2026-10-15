using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EastWestHub.Api.Contracts;
using EastWestHub.Application.Content;
using EastWestHub.Infrastructure.Identity;
using EastWestHub.Infrastructure.Content;

namespace EastWestHub.Api.Controllers;

[ApiController]
[Authorize(Roles = AdminRoles.Administrator)]
[Route("api/admin/settings")]
public sealed class AdminSiteSettingsController(IAdminSiteSettingsManager manager) : ControllerBase
{
    [HttpGet]
    // An unconfigured site is editable; GET must not create or seed database records.
    public async Task<ActionResult<AdminSiteSettingsContent>> Get(CancellationToken ct) =>
        Ok(await manager.GetAsync(ct) ?? new AdminSiteSettingsContent(
            "", "", null, null, null, null, null, null, null, null,
            null, null, null, null, [], Exists: false));

    [HttpPut]
    public async Task<ActionResult<AdminSiteSettingsContent>> Save(SaveAdminSiteSettingsRequest request, CancellationToken ct)
    {
        try { return Ok(await manager.SaveAsync(request.ToModel(), ct)); }
        catch (VideoAdministrationConflictException ex) { return BadRequest(new ProblemDetails { Title = ex.Message }); }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SpaceMedia.Api.Contracts;
using SpaceMedia.Application.Content;
using SpaceMedia.Infrastructure.Identity;

namespace SpaceMedia.Api.Controllers;

[ApiController]
[Authorize(Roles = AdminRoles.Administrator)]
[Route("api/admin/settings")]
public sealed class AdminSiteSettingsController(IAdminSiteSettingsManager manager) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AdminSiteSettingsContent>> Get(CancellationToken ct) =>
        (await manager.GetAsync(ct)) is { } settings ? Ok(settings) : NotFound();

    [HttpPut]
    public async Task<ActionResult<AdminSiteSettingsContent>> Save(SaveAdminSiteSettingsRequest request, CancellationToken ct) =>
        Ok(await manager.SaveAsync(request.ToModel(), ct));
}

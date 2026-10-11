using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EastWestHub.Api.Contracts;
using EastWestHub.Application.Content;
using EastWestHub.Infrastructure.Identity;

namespace EastWestHub.Api.Controllers;

[ApiController]
[Authorize(Roles = AdminRoles.Administrator)]
[Route("api/admin")]
public sealed class AdminPortfolioController(IAdminPortfolioManager manager) : ControllerBase
{
    [HttpGet("services")]
    public async Task<ActionResult<IReadOnlyList<AdminServiceContent>>> GetServices(CancellationToken cancellationToken) =>
        Ok(await manager.GetServicesAsync(cancellationToken));

    [HttpPost("services")]
    public async Task<ActionResult<AdminServiceContent>> CreateService(SaveAdminServiceRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var created = await manager.SaveServiceAsync(null, request.ToModel(), cancellationToken);
            return Created($"/api/admin/services/{created!.Id}", created);
        }
        catch (AdminContentConflictException exception) { return Conflict(new ProblemDetails { Title = exception.Message }); }
    }

    [HttpPut("services/{id:guid}")]
    public async Task<ActionResult<AdminServiceContent>> UpdateService(Guid id, SaveAdminServiceRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var updated = await manager.SaveServiceAsync(id, request.ToModel(), cancellationToken);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (AdminContentConflictException exception) { return Conflict(new ProblemDetails { Title = exception.Message }); }
    }

    [HttpDelete("services/{id:guid}")]
    public async Task<IActionResult> DeleteService(Guid id, CancellationToken cancellationToken) =>
        await manager.DeleteServiceAsync(id, cancellationToken) ? NoContent() : NotFound();

    [HttpGet("portfolio")]
    public async Task<ActionResult<IReadOnlyList<AdminPortfolioContent>>> GetPortfolio(CancellationToken cancellationToken) =>
        Ok(await manager.GetPortfolioAsync(cancellationToken));

    [HttpPost("portfolio")]
    public async Task<ActionResult<AdminPortfolioContent>> CreatePortfolio(SaveAdminPortfolioRequest request, CancellationToken cancellationToken) =>
        await SavePortfolioAsync(null, request, cancellationToken);

    [HttpPut("portfolio/{id:guid}")]
    public async Task<ActionResult<AdminPortfolioContent>> UpdatePortfolio(Guid id, SaveAdminPortfolioRequest request, CancellationToken cancellationToken) =>
        await SavePortfolioAsync(id, request, cancellationToken);

    [HttpDelete("portfolio/{id:guid}")]
    public async Task<IActionResult> DeletePortfolio(Guid id, CancellationToken cancellationToken) =>
        await manager.DeletePortfolioAsync(id, cancellationToken) ? NoContent() : NotFound();

    private async Task<ActionResult<AdminPortfolioContent>> SavePortfolioAsync(Guid? id, SaveAdminPortfolioRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var saved = await manager.SavePortfolioAsync(id, request.ToModel(), cancellationToken);
            if (saved is null) return NotFound();
            return id is null ? Created($"/api/admin/portfolio/{saved.Id}", saved) : Ok(saved);
        }
        catch (AdminContentConflictException exception) { return Conflict(new ProblemDetails { Title = exception.Message }); }
    }
}

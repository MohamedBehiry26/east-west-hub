using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SpaceMedia.Api.Contracts;
using SpaceMedia.Application.Content;
using SpaceMedia.Infrastructure.Identity;

namespace SpaceMedia.Api.Controllers;

[ApiController]
[Authorize(Roles = AdminRoles.Administrator)]
[Route("api/admin")]
public sealed class AdminVideoController(IAdminVideoManager manager) : ControllerBase
{
    [HttpGet("categories")]
    public async Task<ActionResult<IReadOnlyList<AdminCategoryContent>>> GetCategories(CancellationToken ct) => Ok(await manager.GetCategoriesAsync(ct));

    [HttpPost("categories")]
    public async Task<ActionResult<AdminCategoryContent>> CreateCategory(SaveAdminCategoryRequest request, CancellationToken ct) => await SaveCategoryAsync(null, request, ct);

    [HttpPut("categories/{id:guid}")]
    public async Task<ActionResult<AdminCategoryContent>> UpdateCategory(Guid id, SaveAdminCategoryRequest request, CancellationToken ct) => await SaveCategoryAsync(id, request, ct);

    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken ct)
    {
        try { return await manager.DeleteCategoryAsync(id, ct) ? NoContent() : NotFound(); }
        catch (VideoAdministrationConflictException exception) { return Conflict(new ProblemDetails { Title = exception.Message }); }
    }

    [HttpGet("videos")]
    public async Task<ActionResult<IReadOnlyList<AdminVideoContent>>> GetVideos(CancellationToken ct) => Ok(await manager.GetVideosAsync(ct));

    [HttpPost("videos")]
    public async Task<ActionResult<AdminVideoContent>> CreateVideo(SaveAdminVideoRequest request, CancellationToken ct)
    {
        try { var saved = await manager.SaveVideoAsync(null, request.ToModel(), ct); return Created($"/api/admin/videos/{saved!.Id}", saved); }
        catch (VideoAdministrationConflictException exception) { return Conflict(new ProblemDetails { Title = exception.Message }); }
    }
    [HttpPut("videos/{id:guid}")]
    public async Task<ActionResult<AdminVideoContent>> UpdateVideo(Guid id, SaveAdminVideoRequest request, CancellationToken ct)
    {
        try { var saved = await manager.SaveVideoAsync(id, request.ToModel(), ct); return saved is null ? NotFound() : Ok(saved); }
        catch (VideoAdministrationConflictException exception) { return Conflict(new ProblemDetails { Title = exception.Message }); }
    }

    [HttpDelete("videos/{id:guid}")]
    public async Task<IActionResult> DeleteVideo(Guid id, CancellationToken ct) => await manager.DeleteVideoAsync(id, ct) ? NoContent() : NotFound();

    private async Task<ActionResult<AdminCategoryContent>> SaveCategoryAsync(Guid? id, SaveAdminCategoryRequest request, CancellationToken ct)
    {
        try
        {
            var saved = await manager.SaveCategoryAsync(id, request.ToModel(), ct);
            if (saved is null) return NotFound();
            return id is null ? Created($"/api/admin/categories/{saved.Id}", saved) : Ok(saved);
        }
        catch (VideoAdministrationConflictException exception) { return Conflict(new ProblemDetails { Title = exception.Message }); }
    }
}

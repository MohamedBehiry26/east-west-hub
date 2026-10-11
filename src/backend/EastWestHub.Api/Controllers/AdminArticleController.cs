using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EastWestHub.Api.Contracts;
using EastWestHub.Application.Content;
using EastWestHub.Infrastructure.Identity;

namespace EastWestHub.Api.Controllers;

[ApiController]
[Authorize(Roles = AdminRoles.Administrator)]
[Route("api/admin")]
public sealed class AdminArticleController(IAdminArticleManager manager) : ControllerBase
{
    [HttpGet("authors")]
    public async Task<ActionResult<IReadOnlyList<AdminAuthorContent>>> GetAuthors(CancellationToken ct) => Ok(await manager.GetAuthorsAsync(ct));

    [HttpGet("articles")]
    public async Task<ActionResult<IReadOnlyList<AdminArticleContent>>> GetArticles(CancellationToken ct) => Ok(await manager.GetArticlesAsync(ct));

    [HttpPost("articles")]
    public async Task<ActionResult<AdminArticleContent>> CreateArticle(SaveAdminArticleRequest request, CancellationToken ct) => await SaveAsync(null, request, ct);

    [HttpPut("articles/{id:guid}")]
    public async Task<ActionResult<AdminArticleContent>> UpdateArticle(Guid id, SaveAdminArticleRequest request, CancellationToken ct) => await SaveAsync(id, request, ct);

    [HttpDelete("articles/{id:guid}")]
    public async Task<IActionResult> DeleteArticle(Guid id, CancellationToken ct) => await manager.DeleteArticleAsync(id, ct) ? NoContent() : NotFound();

    private async Task<ActionResult<AdminArticleContent>> SaveAsync(Guid? id, SaveAdminArticleRequest request, CancellationToken ct)
    {
        try
        {
            var saved = await manager.SaveArticleAsync(id, request.ToModel(), ct);
            if (saved is null) return NotFound();
            return id is null ? Created($"/api/admin/articles/{saved.Id}", saved) : Ok(saved);
        }
        catch (AdminArticleConflictException ex) { return Conflict(new ProblemDetails { Title = ex.Message }); }
    }
}

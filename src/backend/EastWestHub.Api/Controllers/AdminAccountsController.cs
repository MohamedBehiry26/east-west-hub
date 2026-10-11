using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EastWestHub.Infrastructure.Identity;
using EastWestHub.Infrastructure.Persistence;

namespace EastWestHub.Api.Controllers;

[ApiController]
[Authorize(Roles = AdminRoles.Administrator)]
[Route("api/admin/accounts")]
public sealed class AdminAccountsController(UserManager<ApplicationUser> users, RoleManager<IdentityRole<Guid>> roles, EastWestHubDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateAdminAccountRequest request)
    {
        var email = request.Email.Trim();
        if (await users.FindByEmailAsync(email) is not null)
            return Conflict(new ProblemDetails { Title = "An account with this email already exists." });
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync() : null;
        if (!await roles.RoleExistsAsync(AdminRoles.Administrator))
        {
            var roleResult = await roles.CreateAsync(new IdentityRole<Guid>(AdminRoles.Administrator));
            if (!roleResult.Succeeded) return Problem(statusCode: 500, title: "Could not create the administrator role.");
        }
        var user = new ApplicationUser { Id = Guid.NewGuid(), Email = email, UserName = email, DisplayName = request.DisplayName.Trim(), EmailConfirmed = true };
        var created = await users.CreateAsync(user, request.Password);
        if (!created.Succeeded)
        {
            if (created.Errors.Any(error => error.Code is "DuplicateEmail" or "DuplicateUserName"))
                return Conflict(new ProblemDetails { Title = "An account with this email already exists." });
            return BadRequest(new { title = "Check the account details and password requirements.", errors = created.Errors.Select(error => error.Code).ToArray() });
        }
        var granted = await users.AddToRoleAsync(user, AdminRoles.Administrator);
        if (!granted.Succeeded)
        {
            if (transaction is null) await users.DeleteAsync(user);
            return Problem(statusCode: 500, title: "Could not grant administrator access.");
        }
        if (transaction is not null) await transaction.CommitAsync();
        return StatusCode(201, new { user.Id, user.Email, user.DisplayName });
    }
}

public sealed class CreateAdminAccountRequest
{
    [Required, EmailAddress, StringLength(320)] public string Email { get; init; } = "";
    [Required, StringLength(160)] public string DisplayName { get; init; } = "";
    [Required, StringLength(128, MinimumLength = 12)] public string Password { get; init; } = "";
}
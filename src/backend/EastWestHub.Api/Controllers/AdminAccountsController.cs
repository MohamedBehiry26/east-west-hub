using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EastWestHub.Infrastructure.Identity;
using EastWestHub.Infrastructure.Persistence;

namespace EastWestHub.Api.Controllers;

[ApiController]
[Authorize(Policy = SuperAdminAccount.Policy)]
[Route("api/admin/accounts")]
public sealed class AdminAccountsController(UserManager<ApplicationUser> users, RoleManager<IdentityRole<Guid>> roles, EastWestHubDbContext db, SuperAdminAccount owner) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var admins = await users.GetUsersInRoleAsync(AdminRoles.Administrator);
        return Ok(admins.OrderBy(user => user.Email).Select(user => new { user.Id, user.Email, user.DisplayName, user.IsActive, isSuperAdmin = owner.UserId == user.Id }));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        if (id == owner.UserId) return Conflict(new ProblemDetails { Title = "The Super Admin account is protected." });
        var user = await users.FindByIdAsync(id.ToString());
        if (user is null || !await users.IsInRoleAsync(user, AdminRoles.Administrator)) return NotFound();
        user.IsActive = false;
        var result = await users.UpdateAsync(user);
        return result.Succeeded ? NoContent() : Problem(statusCode: 500, title: "Could not deactivate the account.");
    }
    [HttpPost("{id:guid}/reactivate")]
    public async Task<IActionResult> Reactivate(Guid id)
    {
        var user = await users.FindByIdAsync(id.ToString());
        if (user is null || !await users.IsInRoleAsync(user, AdminRoles.Administrator)) return NotFound();
        if (user.IsActive) return NoContent();
        user.IsActive = true;
        var result = await users.UpdateAsync(user);
        return result.Succeeded ? NoContent() : Problem(statusCode: 500, title: "Could not reactivate the account.");
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAdminAccountRequest request)
    {
        var email = request.Email.Trim();
        if (email.Equals(SuperAdminAccount.OwnerEmail, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ProblemDetails { Title = "The owner email is reserved for the existing Super Admin account." });
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

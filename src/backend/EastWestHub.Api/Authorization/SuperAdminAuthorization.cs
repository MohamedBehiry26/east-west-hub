using System.Security.Claims;
using EastWestHub.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;

namespace EastWestHub.Api.Authorization;

public sealed class SuperAdminRequirement : IAuthorizationRequirement;
public sealed class SuperAdminAuthorization(UserManager<ApplicationUser> users, SuperAdminAccount owner)
    : AuthorizationHandler<SuperAdminRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, SuperAdminRequirement requirement)
    {
        if (!AccountIdClaimResolver.TryResolve(context.User, out var id) || owner.UserId != id) return;
        if (await owner.CanManageAsync(users, await users.FindByIdAsync(id.ToString()))) context.Succeed(requirement);
    }
}

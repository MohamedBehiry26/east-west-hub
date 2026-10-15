using System.Security.Claims;

namespace EastWestHub.Infrastructure.Identity;

public static class AccountIdClaimResolver
{
    public static bool TryResolve(ClaimsPrincipal? principal, out Guid accountId)
    {
        accountId = Guid.Empty;
        // Never fall back to another identity if the primary identity is incomplete.
        if (principal?.Identity is not ClaimsIdentity identity || !identity.IsAuthenticated)
            return false;
        if (!identity.HasClaim(c => c.Type == ClaimTypes.NameIdentifier)) return false;
        Guid? resolved = null;
        foreach (var claim in principal.Claims.Where(c =>
                     c.Type == ClaimTypes.NameIdentifier || c.Type == "sub" || c.Type == "nameid"))
        {
            if (!Guid.TryParse(claim.Value, out var candidate) || candidate == Guid.Empty ||
                (resolved.HasValue && resolved.Value != candidate)) return false;
            resolved = candidate;
        }
        if (!resolved.HasValue) return false;
        accountId = resolved.Value;
        return true;
    }
}

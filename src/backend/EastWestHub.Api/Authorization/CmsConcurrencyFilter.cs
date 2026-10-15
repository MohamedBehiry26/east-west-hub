using System.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using EastWestHub.Domain.Entities;
using EastWestHub.Infrastructure.Persistence;
using Npgsql;

namespace EastWestHub.Api.Authorization;

// Runs after authentication/authorization and model validation. Managers share this scoped context.
public sealed class CmsConcurrencyFilter(EastWestHubDbContext db) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var path = context.HttpContext.Request.Path.Value?.TrimEnd('/') ?? "";
        var parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var types = new Dictionary<string, Type> { ["portfolio"] = typeof(PortfolioProject), ["videos"] = typeof(Video), ["articles"] = typeof(Article), ["services"] = typeof(Service), ["categories"] = typeof(Category), ["settings"] = typeof(SiteSetting) };
        var method = context.HttpContext.Request.Method;
        if (parts.Length < 3 || parts[0] != "api" || parts[1] != "admin" || !types.TryGetValue(parts[2], out var type) || method is not ("PUT" or "DELETE" or "POST")) { await next(); return; }
        var ct = context.HttpContext.RequestAborted;
        var settings = type == typeof(SiteSetting);
        var body = context.ActionArguments.Values.FirstOrDefault(v => v?.GetType().GetProperty("ExpectedVersion") is not null);
        Guid? expected = body?.GetType().GetProperty("ExpectedVersion")?.GetValue(body) as Guid?;
        if (method == "DELETE")
        {
            var raw = context.HttpContext.Request.Query["expectedVersion"].ToString();
            if (raw.Length > 0 && !Guid.TryParse(raw, out var parsed)) { Reject(context, 400, "cms_version_invalid"); return; }
            if (Guid.TryParse(raw, out var token)) expected = token;
        }
        var create = method == "POST";
        var createIfAbsent = settings && body?.GetType().GetProperty("CreateIfAbsent")?.GetValue(body) is true;
        if (!create && !createIfAbsent && !expected.HasValue) { Reject(context, 428, "cms_version_required"); return; }
        if (expected == Guid.Empty) { Reject(context, 400, "cms_version_invalid"); return; }
        if (createIfAbsent && expected.HasValue) { Reject(context, 400, "cms_version_invalid"); return; }
        IDbContextTransaction? tx = null;
        // Serializable also detects phantom service/project links. Never retry a serialization failure.
        if (db.Database.IsRelational()) tx = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        await using var transaction = tx;
        try
        {
            object? entity = null;
            if (!create)
            {
                if (settings) entity = await db.SiteSettings.OrderBy(x => x.Id).FirstOrDefaultAsync(ct);
                else if (parts.Length == 4 && Guid.TryParse(parts[3], out var id)) entity = await db.FindAsync(type, new object[] { id }, ct);
                else { Reject(context, 400, "cms_record_invalid"); return; }
                if (createIfAbsent && entity is not null) { Reject(context, 409, "cms_concurrency_conflict"); return; }
                if (!createIfAbsent && entity is null) { Reject(context, 404, "cms_record_missing"); return; }
                if (entity is ICmsVersioned record)
                {
                    if (record.Version != expected) { Reject(context, 409, "cms_concurrency_conflict"); return; }
                    db.Entry(entity).Property("Version").OriginalValue = expected!.Value;
                    // Force a root UPDATE even if only child collections (or no values) changed.
                    if (method == "PUT") db.Entry(entity).Property("Version").IsModified = true;
                }
                if (method == "DELETE" && entity is Service service)
                {
                    var affected = await db.PortfolioProjects.Where(p => p.ServicesUsed.Any(link => link.ServiceId == service.Id)).ToListAsync(ct);
                    foreach (var project in affected) db.Entry(project).Property(x => x.Version).IsModified = true;
                }
            }
            var executed = await next();
            var error = executed.Exception;
            if (error is DbUpdateConcurrencyException || IsSerializationFailure(error) || (createIfAbsent && IsUniqueFailure(error)))
            {
                executed.ExceptionHandled = true;
                executed.Result = Problem(context, 409, "cms_concurrency_conflict");
                if (tx is not null) await tx.RollbackAsync(ct);
                db.ChangeTracker.Clear();
                return;
            }
            var status = (executed.Result as ObjectResult)?.StatusCode ?? (executed.Result as StatusCodeResult)?.StatusCode ?? 200;
            if (error is not null || status >= 400) { if (tx is not null) await tx.RollbackAsync(ct); return; }
            if (tx is not null) await tx.CommitAsync(ct);
        }
        catch (Exception error) when (error is DbUpdateConcurrencyException || IsSerializationFailure(error) || (createIfAbsent && IsUniqueFailure(error)))
        {
            if (tx is not null) await tx.RollbackAsync(ct);
            db.ChangeTracker.Clear();
            Reject(context, 409, "cms_concurrency_conflict");
        }
    }
    private static bool IsSerializationFailure(Exception? e) => e is PostgresException { SqlState: "40001" or "40P01" } || e?.InnerException is PostgresException { SqlState: "40001" or "40P01" };
    private static bool IsUniqueFailure(Exception? e) => e?.InnerException is PostgresException { SqlState: "23505" };
    private static ObjectResult Problem(ActionExecutingContext context, int status, string code)
    {
        var problem = new ProblemDetails { Status = status, Title = code == "cms_concurrency_conflict" ? "The record changed. Review the current version." : "The record version precondition could not be satisfied." };
        problem.Extensions["code"] = code;
        problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
        return new ObjectResult(problem) { StatusCode = status, ContentTypes = { "application/problem+json" } };
    }
    private static void Reject(ActionExecutingContext context, int status, string code) => context.Result = Problem(context, status, code);
}

using Microsoft.EntityFrameworkCore;
using Npgsql;
using EastWestHub.Application.Content;
using EastWestHub.Domain.Entities;
using EastWestHub.Infrastructure.Persistence;

namespace EastWestHub.Infrastructure.Content;

public sealed class AdminPortfolioManager(EastWestHubDbContext db) : IAdminPortfolioManager
{
    public async Task<IReadOnlyList<AdminServiceContent>> GetServicesAsync(CancellationToken cancellationToken) =>
        await db.Services.AsNoTracking().OrderBy(x => x.DisplayOrder).ThenBy(x => x.TitleEn)
            .Select(x => new AdminServiceContent(x.Id, x.TitleEn, x.TitleAr, x.SlugEn, x.SlugAr,
                x.ShortDescriptionEn, x.ShortDescriptionAr, x.DescriptionEn, x.DescriptionAr,
                x.FeaturesEn, x.FeaturesAr, x.ProcessEn, x.ProcessAr, x.ImageUrl,
                x.DisplayOrder, x.IsPublished, x.SeoTitleEn, x.SeoTitleAr, x.SeoDescriptionEn, x.SeoDescriptionAr, x.Version))
            .ToListAsync(cancellationToken);

    public async Task<AdminServiceContent?> SaveServiceAsync(Guid? id, SaveAdminService input, CancellationToken cancellationToken)
    {
        var entity = id is null ? new Service { TitleEn = input.TitleEn, TitleAr = input.TitleAr, SlugEn = input.SlugEn, SlugAr = input.SlugAr } :
            await db.Services.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return null;
        entity.TitleEn = input.TitleEn; entity.TitleAr = input.TitleAr; entity.SlugEn = input.SlugEn; entity.SlugAr = input.SlugAr;
        entity.ShortDescriptionEn = input.ShortDescriptionEn; entity.ShortDescriptionAr = input.ShortDescriptionAr;
        entity.DescriptionEn = input.DescriptionEn; entity.DescriptionAr = input.DescriptionAr; entity.ImageUrl = input.ImageUrl;
        entity.FeaturesEn = input.FeaturesEn; entity.FeaturesAr = input.FeaturesAr;
        entity.ProcessEn = input.ProcessEn; entity.ProcessAr = input.ProcessAr;
        entity.DisplayOrder = input.DisplayOrder; entity.IsPublished = input.IsPublished;
        entity.SeoTitleEn = input.SeoTitleEn; entity.SeoTitleAr = input.SeoTitleAr;
        entity.SeoDescriptionEn = input.SeoDescriptionEn; entity.SeoDescriptionAr = input.SeoDescriptionAr;
        if (id is null) db.Services.Add(entity);
        await SaveChangesAsync(cancellationToken);
        return new AdminServiceContent(entity.Id, entity.TitleEn, entity.TitleAr, entity.SlugEn, entity.SlugAr, entity.ShortDescriptionEn, entity.ShortDescriptionAr, entity.DescriptionEn, entity.DescriptionAr, entity.FeaturesEn, entity.FeaturesAr, entity.ProcessEn, entity.ProcessAr, entity.ImageUrl, entity.DisplayOrder, entity.IsPublished, entity.SeoTitleEn, entity.SeoTitleAr, entity.SeoDescriptionEn, entity.SeoDescriptionAr, entity.Version);
    }

    public async Task<bool> DeleteServiceAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.Services.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return false;
        db.Services.Remove(entity); await SaveChangesAsync(cancellationToken); return true;
    }

    public async Task<IReadOnlyList<AdminPortfolioContent>> GetPortfolioAsync(CancellationToken cancellationToken) =>
        (await db.PortfolioProjects.AsNoTracking().Include(x => x.Images).Include(x => x.ServicesUsed).OrderBy(x => x.DisplayOrder).ThenBy(x => x.TitleEn)
            .ToListAsync(cancellationToken)).Select(ToContent).ToArray();

    public async Task<AdminPortfolioContent?> SavePortfolioAsync(Guid? id, SaveAdminPortfolio input, CancellationToken cancellationToken)
    {
        var entity = id is null ? new PortfolioProject { TitleEn = input.TitleEn, TitleAr = input.TitleAr, SlugEn = input.SlugEn, SlugAr = input.SlugAr } :
            await db.PortfolioProjects.Include(x => x.Images).Include(x => x.ServicesUsed).SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return null;
        entity.TitleEn = input.TitleEn; entity.TitleAr = input.TitleAr; entity.SlugEn = input.SlugEn; entity.SlugAr = input.SlugAr;
        entity.Client = input.Client; entity.CategoryEn = input.CategoryEn; entity.CategoryAr = input.CategoryAr;
        entity.DescriptionEn = input.DescriptionEn; entity.DescriptionAr = input.DescriptionAr;
        entity.ChallengeEn = input.ChallengeEn; entity.ChallengeAr = input.ChallengeAr;
        entity.ApproachEn = input.ApproachEn; entity.ApproachAr = input.ApproachAr;
        entity.SolutionEn = input.SolutionEn; entity.SolutionAr = input.SolutionAr;
        entity.ResultsEn = input.ResultsEn; entity.ResultsAr = input.ResultsAr; entity.CoverImageUrl = input.CoverImageUrl;
        entity.ProjectDate = input.ProjectDate; entity.DisplayOrder = input.DisplayOrder;
        entity.IsFeatured = input.IsFeatured; entity.IsPublished = input.IsPublished;
        entity.SeoTitleEn = input.SeoTitleEn; entity.SeoTitleAr = input.SeoTitleAr;
        entity.SeoDescriptionEn = input.SeoDescriptionEn; entity.SeoDescriptionAr = input.SeoDescriptionAr;
        entity.Images.Clear();
        entity.ServicesUsed.Clear();
        foreach (var image in input.Images.Where(x => !string.IsNullOrWhiteSpace(x.ImageUrl)))
            entity.Images.Add(new PortfolioImage { ImageUrl = image.ImageUrl!.Trim(), AltTextEn = image.AltTextEn, AltTextAr = image.AltTextAr, DisplayOrder = image.DisplayOrder });
        var serviceIds = input.ServiceIds.Distinct().ToArray();
        var services = await db.Services.Where(x => serviceIds.Contains(x.Id)).ToListAsync(cancellationToken);
        if (services.Count != serviceIds.Length) throw new AdminContentConflictException("One or more selected services no longer exist.");
        foreach (var service in services) entity.ServicesUsed.Add(new ServicePortfolioProject { Service = service });
        if (id is null) db.PortfolioProjects.Add(entity);
        await SaveChangesAsync(cancellationToken);
        return ToContent(entity);
    }

    public async Task<bool> DeletePortfolioAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await db.PortfolioProjects.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null) return false;
        db.PortfolioProjects.Remove(entity); await SaveChangesAsync(cancellationToken); return true;
    }

    private async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        { throw new AdminContentConflictException("A service or project already uses one of these slugs."); }
    }

    private static AdminPortfolioContent ToContent(PortfolioProject x) => new(
        x.Id, x.TitleEn, x.TitleAr, x.SlugEn, x.SlugAr, x.Client, x.CategoryEn, x.CategoryAr, x.DescriptionEn, x.DescriptionAr,
        x.ChallengeEn, x.ChallengeAr, x.ApproachEn, x.ApproachAr, x.SolutionEn, x.SolutionAr, x.ResultsEn, x.ResultsAr, x.CoverImageUrl,
        x.ProjectDate, x.DisplayOrder, x.IsFeatured, x.IsPublished, x.SeoTitleEn, x.SeoTitleAr, x.SeoDescriptionEn, x.SeoDescriptionAr,
        x.Images.OrderBy(image => image.DisplayOrder).Select(image => new AdminPortfolioImageContent(image.Id, image.ImageUrl, image.AltTextEn, image.AltTextAr, image.DisplayOrder)).ToArray(),
        x.ServicesUsed.Select(link => link.ServiceId).ToArray(), x.Version);
}

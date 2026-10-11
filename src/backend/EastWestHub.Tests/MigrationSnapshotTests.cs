using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Metadata;
using EastWestHub.Infrastructure.Persistence;
using Xunit;

namespace EastWestHub.Tests;

public sealed class MigrationSnapshotTests
{
    [Fact]
    public void Rebranded_assembly_discovers_exactly_the_13_deployed_migrations()
    {
        using var db = new EastWestHubDbContext(new DbContextOptionsBuilder<EastWestHubDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=offline_model_only;Username=unused;Password=unused").Options);
        Assert.Equal(new[] {
            "20261005213150_InitialCreate", "20261005215410_AddIdentity",
            "20261005231027_AddPortfolioDisplayOrder", "20261005231323_AddServiceCapabilitiesAndProcess",
            "20261005232305_AddServicePortfolioLinks", "20261005235836_AddYouTubeThumbnailFallback",
            "20261006000037_AddYouTubeSourceMetadata", "20261006002408_AddPortfolioCategoriesAndApproach",
            "20261006202312_AddAdminSeoAndYouTubeSettings", "20261006225658_AddMediaContentTypesAndPodcasts",
            "20261006230208_Phase125ModelDiff", "20261007020845_AllowPosterOnlyMedia",
            "20261008221058_HomepageHeroVideo"
        }, db.Database.GetMigrations());
    }

    [Fact]
    public void Current_ef_model_matches_the_migration_snapshot()
    {
        var options = new DbContextOptionsBuilder<EastWestHubDbContext>()
            .UseNpgsql("Host=127.0.0.1;Database=phase13_model_only;Username=unused;Password=unused")
            .Options;
        using var db = new EastWestHubDbContext(options);
        var migrations = db.GetService<IMigrationsAssembly>();
        var differ = db.GetService<IMigrationsModelDiffer>();
        var snapshot = migrations.ModelSnapshot?.Model ?? throw new InvalidOperationException("The EF migration snapshot is missing.");
        snapshot = db.GetService<IModelRuntimeInitializer>().Initialize(snapshot, designTime: true);
        var currentModel = db.GetService<IDesignTimeModel>().Model;

        Assert.False(differ.HasDifferences(snapshot.GetRelationalModel(), currentModel.GetRelationalModel()));
    }
}

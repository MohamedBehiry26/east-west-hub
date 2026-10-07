using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Metadata;
using SpaceMedia.Infrastructure.Persistence;
using Xunit;

namespace SpaceMedia.Tests;

public sealed class MigrationSnapshotTests
{
    [Fact]
    public void Current_ef_model_matches_the_migration_snapshot()
    {
        var options = new DbContextOptionsBuilder<SpaceMediaDbContext>()
            .UseNpgsql("Host=127.0.0.1;Database=phase13_model_only;Username=unused;Password=unused")
            .Options;
        using var db = new SpaceMediaDbContext(options);
        var migrations = db.GetService<IMigrationsAssembly>();
        var differ = db.GetService<IMigrationsModelDiffer>();
        var snapshot = migrations.ModelSnapshot?.Model ?? throw new InvalidOperationException("The EF migration snapshot is missing.");
        snapshot = db.GetService<IModelRuntimeInitializer>().Initialize(snapshot, designTime: true);
        var currentModel = db.GetService<IDesignTimeModel>().Model;

        Assert.False(differ.HasDifferences(snapshot.GetRelationalModel(), currentModel.GetRelationalModel()));
    }
}

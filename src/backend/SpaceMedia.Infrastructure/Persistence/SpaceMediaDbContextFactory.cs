using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace SpaceMedia.Infrastructure.Persistence;

public sealed class SpaceMediaDbContextFactory : IDesignTimeDbContextFactory<SpaceMediaDbContext>
{
    public SpaceMediaDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .AddUserSecrets<SpaceMediaDbContextFactory>(optional: true)
            .AddEnvironmentVariables()
            .Build();
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Set ConnectionStrings__DefaultConnection in user secrets or the environment before running EF Core tools.");
        }

        var options = new DbContextOptionsBuilder<SpaceMediaDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new SpaceMediaDbContext(options);
    }
}

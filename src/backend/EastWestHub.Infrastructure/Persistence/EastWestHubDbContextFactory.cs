using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace EastWestHub.Infrastructure.Persistence;

public sealed class EastWestHubDbContextFactory : IDesignTimeDbContextFactory<EastWestHubDbContext>
{
    public EastWestHubDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .AddUserSecrets<EastWestHubDbContextFactory>(optional: true)
            .AddEnvironmentVariables()
            .Build();
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Set ConnectionStrings__DefaultConnection in user secrets or the environment before running EF Core tools.");
        }

        var options = new DbContextOptionsBuilder<EastWestHubDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new EastWestHubDbContext(options);
    }
}

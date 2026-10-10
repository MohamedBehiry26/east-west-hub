using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceMedia.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using SpaceMedia.Application.Authentication;
using SpaceMedia.Infrastructure.Identity;
using SpaceMedia.Application.Content;
using SpaceMedia.Infrastructure.Content;

namespace SpaceMedia.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings__DefaultConnection must be configured for every environment.");
        }

        services.AddDbContext<SpaceMediaDbContext>(options => options.UseNpgsql(connectionString));

        services.AddIdentityCore<ApplicationUser>(options =>
        {
            options.User.RequireUniqueEmail = true;
            options.SignIn.RequireConfirmedEmail = true;
            options.Password.RequiredLength = 12;
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Lockout.AllowedForNewUsers = true;
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        })
        .AddRoles<IdentityRole<Guid>>()
        .AddEntityFrameworkStores<SpaceMediaDbContext>()
        .AddSignInManager()
        .AddDefaultTokenProviders();

        services.AddScoped<IAdminAuthService, AdminAuthService>();
        services.AddScoped<IPublicContentReader, PublicContentReader>();
        services.AddScoped<IAdminPortfolioManager, AdminPortfolioManager>();
        services.AddScoped<IAdminArticleManager, AdminArticleManager>();
        services.AddScoped<IAdminSiteSettingsManager, AdminSiteSettingsManager>();
        services.AddScoped<IAdminVideoManager, AdminVideoManager>();

        return services;
    }
}

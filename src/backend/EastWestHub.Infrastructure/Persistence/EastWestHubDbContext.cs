using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using EastWestHub.Domain.Entities;
using EastWestHub.Infrastructure.Identity;

namespace EastWestHub.Infrastructure.Persistence;

public sealed class EastWestHubDbContext(DbContextOptions<EastWestHubDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<User> ContentAuthors => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Video> Videos => Set<Video>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<VideoTag> VideoTags => Set<VideoTag>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<PortfolioProject> PortfolioProjects => Set<PortfolioProject>();
    public DbSet<PortfolioImage> PortfolioImages => Set<PortfolioImage>();
    public DbSet<ServicePortfolioProject> ServicePortfolioProjects => Set<ServicePortfolioProject>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();
    public DbSet<SocialLink> SocialLinks => Set<SocialLink>();

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyCmsVersions();
        ApplyAuditTimestamps();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        ApplyCmsVersions();
        ApplyAuditTimestamps();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Service>().Property(x => x.Version).IsConcurrencyToken();
        modelBuilder.Entity<PortfolioProject>().Property(x => x.Version).IsConcurrencyToken();
        modelBuilder.Entity<Video>().Property(x => x.Version).IsConcurrencyToken();
        modelBuilder.Entity<Article>().Property(x => x.Version).IsConcurrencyToken();
        modelBuilder.Entity<Category>().Property(x => x.Version).IsConcurrencyToken();
        modelBuilder.Entity<SiteSetting>().Property(x => x.Version).IsConcurrencyToken();


        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(x => x.DisplayName).HasMaxLength(160).IsRequired();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Email).HasMaxLength(320).IsRequired();
            entity.Property(x => x.DisplayName).HasMaxLength(160).IsRequired();
            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.NameEn).HasMaxLength(160).IsRequired();
            entity.Property(x => x.NameAr).HasMaxLength(160).IsRequired();
            entity.Property(x => x.SlugEn).HasMaxLength(180).IsRequired();
            entity.Property(x => x.SlugAr).HasMaxLength(180).IsRequired();
            entity.Property(x => x.ImageUrl).HasMaxLength(2048);
            entity.HasIndex(x => x.SlugEn).IsUnique();
            entity.HasIndex(x => x.SlugAr).IsUnique();
            entity.HasIndex(x => new { x.IsPublished, x.DisplayOrder });
        });

        modelBuilder.Entity<Video>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.YouTubeVideoId).HasMaxLength(32);
            entity.Property(x => x.ContentType).HasConversion<int>();
            entity.Property(x => x.TitleEn).HasMaxLength(250).IsRequired();
            entity.Property(x => x.TitleAr).HasMaxLength(250).IsRequired();
            entity.Property(x => x.SlugEn).HasMaxLength(180).IsRequired();
            entity.Property(x => x.SlugAr).HasMaxLength(180).IsRequired();
            entity.Property(x => x.ThumbnailUrl).HasMaxLength(2048);
            entity.Property(x => x.GuestNameEn).HasMaxLength(160);
            entity.Property(x => x.GuestNameAr).HasMaxLength(160);
            entity.Property(x => x.SeoTitleEn).HasMaxLength(250);
            entity.Property(x => x.SeoTitleAr).HasMaxLength(250);
            entity.Property(x => x.SeoDescriptionEn).HasMaxLength(500);
            entity.Property(x => x.SeoDescriptionAr).HasMaxLength(500);
            entity.HasIndex(x => x.YouTubeVideoId).IsUnique();
            entity.HasIndex(x => x.SlugEn).IsUnique();
            entity.HasIndex(x => x.SlugAr).IsUnique();
            entity.HasIndex(x => new { x.IsPublished, x.PublishedAt });
            entity.HasOne(x => x.Category).WithMany(x => x.Videos)
                .HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.NameEn).HasMaxLength(100).IsRequired();
            entity.Property(x => x.NameAr).HasMaxLength(100).IsRequired();
            entity.Property(x => x.SlugEn).HasMaxLength(120).IsRequired();
            entity.Property(x => x.SlugAr).HasMaxLength(120).IsRequired();
            entity.HasIndex(x => x.SlugEn).IsUnique();
            entity.HasIndex(x => x.SlugAr).IsUnique();
        });

        modelBuilder.Entity<VideoTag>(entity =>
        {
            entity.HasKey(x => new { x.VideoId, x.TagId });
            entity.HasOne(x => x.Video).WithMany(x => x.VideoTags)
                .HasForeignKey(x => x.VideoId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Tag).WithMany(x => x.VideoTags)
                .HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Service>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TitleEn).HasMaxLength(200).IsRequired();
            entity.Property(x => x.TitleAr).HasMaxLength(200).IsRequired();
            entity.Property(x => x.SlugEn).HasMaxLength(180).IsRequired();
            entity.Property(x => x.SlugAr).HasMaxLength(180).IsRequired();
            entity.Property(x => x.ImageUrl).HasMaxLength(2048);
            entity.HasIndex(x => x.SlugEn).IsUnique();
            entity.HasIndex(x => x.SlugAr).IsUnique();
            entity.HasIndex(x => new { x.IsPublished, x.DisplayOrder });
        });

        modelBuilder.Entity<PortfolioProject>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TitleEn).HasMaxLength(200).IsRequired();
            entity.Property(x => x.TitleAr).HasMaxLength(200).IsRequired();
            entity.Property(x => x.SlugEn).HasMaxLength(180).IsRequired();
            entity.Property(x => x.SlugAr).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Client).HasMaxLength(160);
            entity.Property(x => x.CategoryEn).HasMaxLength(120);
            entity.Property(x => x.CategoryAr).HasMaxLength(120);
            entity.Property(x => x.CoverImageUrl).HasMaxLength(2048);
            entity.HasIndex(x => x.SlugEn).IsUnique();
            entity.HasIndex(x => x.SlugAr).IsUnique();
            entity.HasIndex(x => new { x.IsPublished, x.IsFeatured, x.DisplayOrder, x.ProjectDate });
        });

        modelBuilder.Entity<PortfolioImage>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ImageUrl).HasMaxLength(2048).IsRequired();
            entity.Property(x => x.AltTextEn).HasMaxLength(250);
            entity.Property(x => x.AltTextAr).HasMaxLength(250);
            entity.HasIndex(x => new { x.PortfolioProjectId, x.DisplayOrder });
            entity.HasOne(x => x.PortfolioProject).WithMany(x => x.Images)
                .HasForeignKey(x => x.PortfolioProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ServicePortfolioProject>(entity =>
        {
            entity.HasKey(x => new { x.ServiceId, x.PortfolioProjectId });
            entity.HasOne(x => x.Service).WithMany(x => x.PortfolioProjects)
                .HasForeignKey(x => x.ServiceId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.PortfolioProject).WithMany(x => x.ServicesUsed)
                .HasForeignKey(x => x.PortfolioProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Article>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TitleEn).HasMaxLength(250).IsRequired();
            entity.Property(x => x.TitleAr).HasMaxLength(250).IsRequired();
            entity.Property(x => x.SlugEn).HasMaxLength(180).IsRequired();
            entity.Property(x => x.SlugAr).HasMaxLength(180).IsRequired();
            entity.Property(x => x.CoverImageUrl).HasMaxLength(2048);
            entity.HasIndex(x => x.SlugEn).IsUnique();
            entity.HasIndex(x => x.SlugAr).IsUnique();
            entity.HasIndex(x => new { x.IsPublished, x.PublishedAt });
            entity.HasOne(x => x.Author).WithMany(x => x.Articles)
                .HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SiteSetting>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.AgencyNameEn).HasMaxLength(160).IsRequired();
            entity.Property(x => x.AgencyNameAr).HasMaxLength(160).IsRequired();
            entity.Property(x => x.LogoUrl).HasMaxLength(2048);
            entity.Property(x => x.FaviconUrl).HasMaxLength(2048);
            entity.Property(x => x.Email).HasMaxLength(320);
            entity.Property(x => x.Phone).HasMaxLength(40);
            entity.Property(x => x.HeroMp4Url).HasMaxLength(2048);
            entity.Property(x => x.HeroPosterImageUrl).HasMaxLength(2048);
            entity.Property(x => x.HeroYouTubeVideoId).HasMaxLength(11);
            entity.Property(x => x.YouTubeChannelId).HasMaxLength(80);
            entity.Property(x => x.DefaultSeoTitleEn).HasMaxLength(250);
            entity.Property(x => x.DefaultSeoTitleAr).HasMaxLength(250);
            entity.Property(x => x.DefaultSeoDescriptionEn).HasMaxLength(500);
            entity.Property(x => x.DefaultSeoDescriptionAr).HasMaxLength(500);
        });

        modelBuilder.Entity<SocialLink>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Platform).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Url).HasMaxLength(2048).IsRequired();
            entity.HasIndex(x => new { x.SiteSettingId, x.Platform }).IsUnique();
            entity.HasOne(x => x.SiteSetting).WithMany(x => x.SocialLinks)
                .HasForeignKey(x => x.SiteSettingId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    private void ApplyCmsVersions()
    {
        ChangeTracker.DetectChanges();
        foreach (var entry in ChangeTracker.Entries<ICmsVersioned>())
            if (entry.State is EntityState.Added or EntityState.Modified)
                entry.Entity.Version = Guid.NewGuid();
    }
    private void ApplyAuditTimestamps()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = null;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
                entry.Property(entity => entity.CreatedAt).IsModified = false;
            }
        }
    }
}

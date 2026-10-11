using Microsoft.EntityFrameworkCore;
using EastWestHub.Domain.Entities;
using EastWestHub.Infrastructure.Persistence;
using Xunit;

namespace EastWestHub.Tests;
public sealed class DevelopmentSeederTests
{
    private static EastWestHubDbContext NewDb() => new(new DbContextOptionsBuilder<EastWestHubDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    [Fact]
    public async Task Catalog_is_bilingual_complete_and_repeatable_without_overwriting_editors()
    {
        await using var db = NewDb();
        await DevelopmentSeeder.SeedAsync(db, "Development");
        Assert.Equal(10, await db.Services.CountAsync());
        Assert.Equal(8, await db.Categories.CountAsync());
        Assert.Equal(13, await db.Tags.CountAsync());
        Assert.Equal(22, await db.Videos.CountAsync());
        Assert.Equal(6, await db.Videos.CountAsync(x=>x.ContentType==MediaContentType.Podcast));
        Assert.Equal(8, await db.PortfolioProjects.CountAsync());
        Assert.Equal(8, await db.Articles.CountAsync());
        Assert.All(db.Services, s=> {Assert.False(string.IsNullOrWhiteSpace(s.DescriptionEn)); Assert.False(string.IsNullOrWhiteSpace(s.DescriptionAr)); Assert.DoesNotContain("Demo",s.TitleEn);});
        Assert.All(db.PortfolioProjects,p=>Assert.Null(p.Client));
        Assert.Equal("M7lc1UVf-VE", Assert.Single(db.Videos.Where(x=>x.YouTubeVideoId!=null)).YouTubeVideoId);
        var service=await db.Services.FirstAsync(); service.TitleEn="Editor's approved title";
        var video=await db.Videos.FirstAsync();video.DescriptionAr="تعديل المحرر";video.IsPublished=false;
        await db.SaveChangesAsync();
        await DevelopmentSeeder.SeedAsync(db,"Development");
        await DevelopmentSeeder.SeedAsync(db,"Development");
        Assert.Equal(10,await db.Services.CountAsync()); Assert.Equal(22,await db.Videos.CountAsync());
        Assert.Equal(8,await db.Articles.CountAsync());Assert.Equal(8,await db.PortfolioProjects.CountAsync());
        Assert.Equal("Editor's approved title",(await db.Services.FindAsync(service.Id))!.TitleEn);
        Assert.Equal("تعديل المحرر",(await db.Videos.FindAsync(video.Id))!.DescriptionAr);
        Assert.False((await db.Videos.FindAsync(video.Id))!.IsPublished);
    }
    [Fact]
    public async Task Exact_legacy_project_gallery_is_replaced_once()
    {
        await using var db=NewDb();
        db.PortfolioProjects.Add(new PortfolioProject {Id=DevelopmentSeeder.Id(501),TitleEn="Old demo",TitleAr="قديم",SlugEn="old-project",SlugAr="old-project-ar",DescriptionEn="Fictional development sample. No real client or performance claim.",Images=[new PortfolioImage{Id=Guid.NewGuid(),ImageUrl="/old.svg"}]});
        await db.SaveChangesAsync();
        await DevelopmentSeeder.SeedAsync(db,"Development");
        var project=await db.PortfolioProjects.Include(x=>x.Images).SingleAsync(x=>x.Id==DevelopmentSeeder.Id(501));
        Assert.Equal(2,project.Images.Count);Assert.DoesNotContain(project.Images,x=>x.ImageUrl=="/old.svg");
        project.TitleAr="تعديل محفوظ";await db.SaveChangesAsync();
        await DevelopmentSeeder.SeedAsync(db,"Development");
        Assert.Equal("تعديل محفوظ",project.TitleAr);Assert.Equal(2,project.Images.Count);
    }
    [Theory]
    [InlineData("Production")][InlineData("Staging")][InlineData("")]
    public async Task Other_environments_never_insert_content(string environment)
    {
        await using var db=NewDb();await DevelopmentSeeder.SeedAsync(db,environment);
        Assert.Empty(db.Videos);Assert.Empty(db.Services);Assert.Empty(db.Articles);Assert.Empty(db.PortfolioProjects);Assert.Empty(db.SiteSettings);
    }
    [Fact]
    public async Task Unrelated_content_and_slug_collisions_are_preserved()
    {
        await using var db=NewDb();
        var category=new Category{Id=Guid.NewGuid(),NameEn="Keep",NameAr="احتفظ",SlugEn="programs",SlugAr="keep",IsPublished=true};
        db.Categories.Add(category);await db.SaveChangesAsync();
        await DevelopmentSeeder.SeedAsync(db,"Development");
        Assert.Equal("Keep",(await db.Categories.FindAsync(category.Id))!.NameEn);
        Assert.Equal(1,await db.Categories.CountAsync(x=>x.SlugEn=="programs"));
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SpaceMedia.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NameEn = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    NameAr = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    SlugEn = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    SlugAr = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    DescriptionEn = table.Column<string>(type: "text", nullable: true),
                    DescriptionAr = table.Column<string>(type: "text", nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    SeoTitleEn = table.Column<string>(type: "text", nullable: true),
                    SeoTitleAr = table.Column<string>(type: "text", nullable: true),
                    SeoDescriptionEn = table.Column<string>(type: "text", nullable: true),
                    SeoDescriptionAr = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PortfolioProjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TitleEn = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TitleAr = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SlugEn = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    SlugAr = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    Client = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    DescriptionEn = table.Column<string>(type: "text", nullable: true),
                    DescriptionAr = table.Column<string>(type: "text", nullable: true),
                    ChallengeEn = table.Column<string>(type: "text", nullable: true),
                    ChallengeAr = table.Column<string>(type: "text", nullable: true),
                    SolutionEn = table.Column<string>(type: "text", nullable: true),
                    SolutionAr = table.Column<string>(type: "text", nullable: true),
                    ResultsEn = table.Column<string>(type: "text", nullable: true),
                    ResultsAr = table.Column<string>(type: "text", nullable: true),
                    CoverImageUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    ProjectDate = table.Column<DateOnly>(type: "date", nullable: true),
                    IsFeatured = table.Column<bool>(type: "boolean", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    SeoTitleEn = table.Column<string>(type: "text", nullable: true),
                    SeoTitleAr = table.Column<string>(type: "text", nullable: true),
                    SeoDescriptionEn = table.Column<string>(type: "text", nullable: true),
                    SeoDescriptionAr = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PortfolioProjects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Services",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TitleEn = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TitleAr = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SlugEn = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    SlugAr = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    ShortDescriptionEn = table.Column<string>(type: "text", nullable: true),
                    ShortDescriptionAr = table.Column<string>(type: "text", nullable: true),
                    DescriptionEn = table.Column<string>(type: "text", nullable: true),
                    DescriptionAr = table.Column<string>(type: "text", nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    SeoTitleEn = table.Column<string>(type: "text", nullable: true),
                    SeoTitleAr = table.Column<string>(type: "text", nullable: true),
                    SeoDescriptionEn = table.Column<string>(type: "text", nullable: true),
                    SeoDescriptionAr = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Services", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SiteSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AgencyNameEn = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    AgencyNameAr = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    AgencyDescriptionEn = table.Column<string>(type: "text", nullable: true),
                    AgencyDescriptionAr = table.Column<string>(type: "text", nullable: true),
                    LogoUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    FaviconUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    Phone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    AddressEn = table.Column<string>(type: "text", nullable: true),
                    AddressAr = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SiteSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Tags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NameEn = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NameAr = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SlugEn = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    SlugAr = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Videos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    YouTubeVideoId = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    TitleEn = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    TitleAr = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    SlugEn = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    SlugAr = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    DescriptionEn = table.Column<string>(type: "text", nullable: true),
                    DescriptionAr = table.Column<string>(type: "text", nullable: true),
                    ThumbnailUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Duration = table.Column<TimeSpan>(type: "interval", nullable: true),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsFeatured = table.Column<bool>(type: "boolean", nullable: false),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Videos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Videos_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PortfolioImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PortfolioProjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    AltTextEn = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    AltTextAr = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PortfolioImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PortfolioImages_PortfolioProjects_PortfolioProjectId",
                        column: x => x.PortfolioProjectId,
                        principalTable: "PortfolioProjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SocialLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SiteSettingId = table.Column<int>(type: "integer", nullable: false),
                    Platform = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsVisible = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SocialLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SocialLinks_SiteSettings_SiteSettingId",
                        column: x => x.SiteSettingId,
                        principalTable: "SiteSettings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Articles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TitleEn = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    TitleAr = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: false),
                    SlugEn = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    SlugAr = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    ExcerptEn = table.Column<string>(type: "text", nullable: true),
                    ExcerptAr = table.Column<string>(type: "text", nullable: true),
                    ContentEn = table.Column<string>(type: "text", nullable: true),
                    ContentAr = table.Column<string>(type: "text", nullable: true),
                    CoverImageUrl = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: true),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    PublishedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false),
                    SeoTitleEn = table.Column<string>(type: "text", nullable: true),
                    SeoTitleAr = table.Column<string>(type: "text", nullable: true),
                    SeoDescriptionEn = table.Column<string>(type: "text", nullable: true),
                    SeoDescriptionAr = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Articles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Articles_Users_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VideoTags",
                columns: table => new
                {
                    VideoId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoTags", x => new { x.VideoId, x.TagId });
                    table.ForeignKey(
                        name: "FK_VideoTags_Tags_TagId",
                        column: x => x.TagId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VideoTags_Videos_VideoId",
                        column: x => x.VideoId,
                        principalTable: "Videos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Articles_AuthorId",
                table: "Articles",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_Articles_IsPublished_PublishedAt",
                table: "Articles",
                columns: new[] { "IsPublished", "PublishedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Articles_SlugAr",
                table: "Articles",
                column: "SlugAr",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Articles_SlugEn",
                table: "Articles",
                column: "SlugEn",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_IsPublished_DisplayOrder",
                table: "Categories",
                columns: new[] { "IsPublished", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_SlugAr",
                table: "Categories",
                column: "SlugAr",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Categories_SlugEn",
                table: "Categories",
                column: "SlugEn",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PortfolioImages_PortfolioProjectId_DisplayOrder",
                table: "PortfolioImages",
                columns: new[] { "PortfolioProjectId", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_PortfolioProjects_IsPublished_IsFeatured_ProjectDate",
                table: "PortfolioProjects",
                columns: new[] { "IsPublished", "IsFeatured", "ProjectDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PortfolioProjects_SlugAr",
                table: "PortfolioProjects",
                column: "SlugAr",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PortfolioProjects_SlugEn",
                table: "PortfolioProjects",
                column: "SlugEn",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Services_IsPublished_DisplayOrder",
                table: "Services",
                columns: new[] { "IsPublished", "DisplayOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Services_SlugAr",
                table: "Services",
                column: "SlugAr",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Services_SlugEn",
                table: "Services",
                column: "SlugEn",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SocialLinks_SiteSettingId_Platform",
                table: "SocialLinks",
                columns: new[] { "SiteSettingId", "Platform" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tags_SlugAr",
                table: "Tags",
                column: "SlugAr",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tags_SlugEn",
                table: "Tags",
                column: "SlugEn",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Videos_CategoryId",
                table: "Videos",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Videos_IsPublished_PublishedAt",
                table: "Videos",
                columns: new[] { "IsPublished", "PublishedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Videos_SlugAr",
                table: "Videos",
                column: "SlugAr",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Videos_SlugEn",
                table: "Videos",
                column: "SlugEn",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Videos_YouTubeVideoId",
                table: "Videos",
                column: "YouTubeVideoId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VideoTags_TagId",
                table: "VideoTags",
                column: "TagId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Articles");

            migrationBuilder.DropTable(
                name: "PortfolioImages");

            migrationBuilder.DropTable(
                name: "Services");

            migrationBuilder.DropTable(
                name: "SocialLinks");

            migrationBuilder.DropTable(
                name: "VideoTags");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "PortfolioProjects");

            migrationBuilder.DropTable(
                name: "SiteSettings");

            migrationBuilder.DropTable(
                name: "Tags");

            migrationBuilder.DropTable(
                name: "Videos");

            migrationBuilder.DropTable(
                name: "Categories");
        }
    }
}

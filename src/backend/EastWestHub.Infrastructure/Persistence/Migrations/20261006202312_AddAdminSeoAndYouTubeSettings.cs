using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EastWestHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminSeoAndYouTubeSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultSeoDescriptionAr",
                table: "SiteSettings",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefaultSeoDescriptionEn",
                table: "SiteSettings",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefaultSeoTitleAr",
                table: "SiteSettings",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefaultSeoTitleEn",
                table: "SiteSettings",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "YouTubeChannelId",
                table: "SiteSettings",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultSeoDescriptionAr",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "DefaultSeoDescriptionEn",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "DefaultSeoTitleAr",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "DefaultSeoTitleEn",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "YouTubeChannelId",
                table: "SiteSettings");
        }
    }
}

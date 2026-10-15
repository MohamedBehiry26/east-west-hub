using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EastWestHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CinematicHeroMedia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HeroMp4Url",
                table: "SiteSettings",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HeroPosterImageUrl",
                table: "SiteSettings",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HeroMp4Url",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "HeroPosterImageUrl",
                table: "SiteSettings");
        }
    }
}

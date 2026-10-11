using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EastWestHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaContentTypesAndPodcasts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ContentType",
                table: "Videos",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "EpisodeNumber",
                table: "Videos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuestNameAr",
                table: "Videos",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuestNameEn",
                table: "Videos",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SeasonNumber",
                table: "Videos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SeoDescriptionAr",
                table: "Videos",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SeoDescriptionEn",
                table: "Videos",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SeoTitleAr",
                table: "Videos",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SeoTitleEn",
                table: "Videos",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContentType",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "EpisodeNumber",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "GuestNameAr",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "GuestNameEn",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "SeasonNumber",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "SeoDescriptionAr",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "SeoDescriptionEn",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "SeoTitleAr",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "SeoTitleEn",
                table: "Videos");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EastWestHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddYouTubeSourceMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "YouTubeDescription",
                table: "Videos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "YouTubeTitle",
                table: "Videos",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "YouTubeDescription",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "YouTubeTitle",
                table: "Videos");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EastWestHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddYouTubeThumbnailFallback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "YouTubeThumbnailUrl",
                table: "Videos",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "YouTubeThumbnailUrl",
                table: "Videos");
        }
    }
}

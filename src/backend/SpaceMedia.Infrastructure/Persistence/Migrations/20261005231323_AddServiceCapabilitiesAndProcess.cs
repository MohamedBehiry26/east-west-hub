using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceMedia.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceCapabilitiesAndProcess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FeaturesAr",
                table: "Services",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FeaturesEn",
                table: "Services",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProcessAr",
                table: "Services",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProcessEn",
                table: "Services",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FeaturesAr",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "FeaturesEn",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "ProcessAr",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "ProcessEn",
                table: "Services");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EastWestHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPortfolioCategoriesAndApproach : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApproachAr",
                table: "PortfolioProjects",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ApproachEn",
                table: "PortfolioProjects",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CategoryAr",
                table: "PortfolioProjects",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CategoryEn",
                table: "PortfolioProjects",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApproachAr",
                table: "PortfolioProjects");

            migrationBuilder.DropColumn(
                name: "ApproachEn",
                table: "PortfolioProjects");

            migrationBuilder.DropColumn(
                name: "CategoryAr",
                table: "PortfolioProjects");

            migrationBuilder.DropColumn(
                name: "CategoryEn",
                table: "PortfolioProjects");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceMedia.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPortfolioDisplayOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PortfolioProjects_IsPublished_IsFeatured_ProjectDate",
                table: "PortfolioProjects");

            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                table: "PortfolioProjects",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_PortfolioProjects_IsPublished_IsFeatured_DisplayOrder_Proje~",
                table: "PortfolioProjects",
                columns: new[] { "IsPublished", "IsFeatured", "DisplayOrder", "ProjectDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PortfolioProjects_IsPublished_IsFeatured_DisplayOrder_Proje~",
                table: "PortfolioProjects");

            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                table: "PortfolioProjects");

            migrationBuilder.CreateIndex(
                name: "IX_PortfolioProjects_IsPublished_IsFeatured_ProjectDate",
                table: "PortfolioProjects",
                columns: new[] { "IsPublished", "IsFeatured", "ProjectDate" });
        }
    }
}

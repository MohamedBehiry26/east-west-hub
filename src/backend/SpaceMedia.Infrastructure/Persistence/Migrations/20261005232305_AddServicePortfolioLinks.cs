using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceMedia.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddServicePortfolioLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ServicePortfolioProjects",
                columns: table => new
                {
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    PortfolioProjectId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServicePortfolioProjects", x => new { x.ServiceId, x.PortfolioProjectId });
                    table.ForeignKey(
                        name: "FK_ServicePortfolioProjects_PortfolioProjects_PortfolioProject~",
                        column: x => x.PortfolioProjectId,
                        principalTable: "PortfolioProjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ServicePortfolioProjects_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ServicePortfolioProjects_PortfolioProjectId",
                table: "ServicePortfolioProjects",
                column: "PortfolioProjectId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ServicePortfolioProjects");
        }
    }
}

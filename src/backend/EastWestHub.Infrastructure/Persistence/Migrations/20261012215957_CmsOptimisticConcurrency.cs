using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EastWestHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CmsOptimisticConcurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "Version",
                table: "Videos",
                type: "uuid",
                nullable: false,
                defaultValueSql: "gen_random_uuid()");

            migrationBuilder.AddColumn<Guid>(
                name: "Version",
                table: "SiteSettings",
                type: "uuid",
                nullable: false,
                defaultValueSql: "gen_random_uuid()");

            migrationBuilder.AddColumn<Guid>(
                name: "Version",
                table: "Services",
                type: "uuid",
                nullable: false,
                defaultValueSql: "gen_random_uuid()");

            migrationBuilder.AddColumn<Guid>(
                name: "Version",
                table: "PortfolioProjects",
                type: "uuid",
                nullable: false,
                defaultValueSql: "gen_random_uuid()");

            migrationBuilder.AddColumn<Guid>(
                name: "Version",
                table: "Categories",
                type: "uuid",
                nullable: false,
                defaultValueSql: "gen_random_uuid()");

            migrationBuilder.AddColumn<Guid>(
                name: "Version",
                table: "Articles",
                type: "uuid",
                nullable: false,
                defaultValueSql: "gen_random_uuid()");
            migrationBuilder.Sql("ALTER TABLE \"Videos\" ALTER COLUMN \"Version\" DROP DEFAULT;");
            migrationBuilder.Sql("ALTER TABLE \"SiteSettings\" ALTER COLUMN \"Version\" DROP DEFAULT;");
            migrationBuilder.Sql("ALTER TABLE \"Services\" ALTER COLUMN \"Version\" DROP DEFAULT;");
            migrationBuilder.Sql("ALTER TABLE \"PortfolioProjects\" ALTER COLUMN \"Version\" DROP DEFAULT;");
            migrationBuilder.Sql("ALTER TABLE \"Categories\" ALTER COLUMN \"Version\" DROP DEFAULT;");
            migrationBuilder.Sql("ALTER TABLE \"Articles\" ALTER COLUMN \"Version\" DROP DEFAULT;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Version",
                table: "Videos");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "Services");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "PortfolioProjects");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "Articles");
        }
    }
}

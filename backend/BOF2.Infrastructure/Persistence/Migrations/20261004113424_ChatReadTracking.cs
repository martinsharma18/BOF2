using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BOF2.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ChatReadTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "applicant_read_at",
                table: "applications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "company_read_at",
                table: "applications",
                type: "timestamp with time zone",
                nullable: true);

            // Conversations that existed before read tracking start as read, so nobody gets a wall of old badges.
            migrationBuilder.Sql("UPDATE applications SET applicant_read_at = now(), company_read_at = now();");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "applicant_read_at",
                table: "applications");

            migrationBuilder.DropColumn(
                name: "company_read_at",
                table: "applications");
        }
    }
}

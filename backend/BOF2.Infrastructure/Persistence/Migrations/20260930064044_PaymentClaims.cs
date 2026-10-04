using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BOF2.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PaymentClaims : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "claim_note",
                table: "applications",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "claimed_amount",
                table: "applications",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "claimed_at",
                table: "applications",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "claim_note",
                table: "applications");

            migrationBuilder.DropColumn(
                name: "claimed_amount",
                table: "applications");

            migrationBuilder.DropColumn(
                name: "claimed_at",
                table: "applications");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Feedora.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InboxFlowLocalLevels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "announced_at",
                table: "vacancies",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "actor_id",
                table: "notifications",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "claim_decline_reason",
                table: "applications",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "inbox_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    invitation_id = table.Column<Guid>(type: "uuid", nullable: true),
                    vacancy_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_read = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_inbox_items", x => x.id);
                    table.ForeignKey(
                        name: "fk_inbox_items_invitations_invitation_id",
                        column: x => x.invitation_id,
                        principalTable: "invitations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_inbox_items_users_user_id",
                        column: x => x.user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_inbox_items_vacancies_vacancy_id",
                        column: x => x.vacancy_id,
                        principalTable: "vacancies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "local_levels",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    province = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    district = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_local_levels", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_notifications_actor_id",
                table: "notifications",
                column: "actor_id");

            migrationBuilder.CreateIndex(
                name: "ix_inbox_items_invitation_id",
                table: "inbox_items",
                column: "invitation_id");

            migrationBuilder.CreateIndex(
                name: "ix_inbox_items_user_id_is_read_created_at",
                table: "inbox_items",
                columns: new[] { "user_id", "is_read", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_inbox_items_vacancy_id",
                table: "inbox_items",
                column: "vacancy_id");

            migrationBuilder.CreateIndex(
                name: "ix_local_levels_district_name",
                table: "local_levels",
                columns: new[] { "district", "name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "fk_notifications_users_actor_id",
                table: "notifications",
                column: "actor_id",
                principalTable: "AspNetUsers",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_notifications_users_actor_id",
                table: "notifications");

            migrationBuilder.DropTable(
                name: "inbox_items");

            migrationBuilder.DropTable(
                name: "local_levels");

            migrationBuilder.DropIndex(
                name: "ix_notifications_actor_id",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "announced_at",
                table: "vacancies");

            migrationBuilder.DropColumn(
                name: "actor_id",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "claim_decline_reason",
                table: "applications");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Feedora.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InvitationsVacanciesLocalLevels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "local_level",
                table: "posts",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "date_of_birth",
                table: "individual_profiles",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "local_level",
                table: "individual_profiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "local_level",
                table: "company_profiles",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "invitations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    message = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    post_id = table.Column<Guid>(type: "uuid", nullable: true),
                    province = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    district = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    local_level = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    gender = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    min_age = table.Column<int>(type: "integer", nullable: true),
                    max_age = table.Column<int>(type: "integer", nullable: true),
                    recipient_count = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_invitations", x => x.id);
                    table.ForeignKey(
                        name: "fk_invitations_posts_post_id",
                        column: x => x.post_id,
                        principalTable: "posts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_invitations_users_company_id",
                        column: x => x.company_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vacancies",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    organization = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    location = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    how_to_apply = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    deadline = table.Column<DateOnly>(type: "date", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vacancies", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_invitations_company_id_created_at",
                table: "invitations",
                columns: new[] { "company_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_invitations_post_id",
                table: "invitations",
                column: "post_id");

            migrationBuilder.CreateIndex(
                name: "ix_vacancies_is_active_created_at",
                table: "vacancies",
                columns: new[] { "is_active", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "invitations");

            migrationBuilder.DropTable(
                name: "vacancies");

            migrationBuilder.DropColumn(
                name: "local_level",
                table: "posts");

            migrationBuilder.DropColumn(
                name: "date_of_birth",
                table: "individual_profiles");

            migrationBuilder.DropColumn(
                name: "local_level",
                table: "individual_profiles");

            migrationBuilder.DropColumn(
                name: "local_level",
                table: "company_profiles");
        }
    }
}

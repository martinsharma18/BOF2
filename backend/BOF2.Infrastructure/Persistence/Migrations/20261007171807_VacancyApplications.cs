using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BOF2.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class VacancyApplications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "vacancy_applications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    vacancy_id = table.Column<Guid>(type: "uuid", nullable: false),
                    applicant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    cv_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    cv_file_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    note = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_vacancy_applications", x => x.id);
                    table.ForeignKey(
                        name: "fk_vacancy_applications_users_applicant_id",
                        column: x => x.applicant_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_vacancy_applications_vacancies_vacancy_id",
                        column: x => x.vacancy_id,
                        principalTable: "vacancies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_vacancy_applications_applicant_id",
                table: "vacancy_applications",
                column: "applicant_id");

            migrationBuilder.CreateIndex(
                name: "ix_vacancy_applications_status_created_at",
                table: "vacancy_applications",
                columns: new[] { "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_vacancy_applications_vacancy_id_applicant_id",
                table: "vacancy_applications",
                columns: new[] { "vacancy_id", "applicant_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "vacancy_applications");
        }
    }
}

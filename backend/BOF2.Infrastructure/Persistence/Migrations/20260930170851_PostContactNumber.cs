using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BOF2.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PostContactNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "contact_number",
                table: "posts",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "contact_number",
                table: "posts");
        }
    }
}

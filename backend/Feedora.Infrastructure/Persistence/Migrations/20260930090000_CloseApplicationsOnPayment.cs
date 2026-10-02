using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Feedora.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Data only: one application is now one job with one payment. Applications that were already
    /// paid become Completed so they can't be claimed or paid again.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260930090000_CloseApplicationsOnPayment")]
    public partial class CloseApplicationsOnPayment : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE applications a
                SET status = 'Completed', updated_at = now()
                WHERE a.status = 'Accepted'
                  AND EXISTS (SELECT 1 FROM payments p WHERE p.application_id = a.id);
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE applications SET status = 'Accepted' WHERE status = 'Completed';");
        }
    }
}

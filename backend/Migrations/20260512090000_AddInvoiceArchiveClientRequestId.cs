using backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260512090000_AddInvoiceArchiveClientRequestId")]
    public partial class AddInvoiceArchiveClientRequestId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql("""
ALTER TABLE "InvoiceArchives"
ADD COLUMN IF NOT EXISTS "ClientRequestId" character varying(100) NULL;
""");

                migrationBuilder.Sql("""
CREATE UNIQUE INDEX IF NOT EXISTS "IX_InvoiceArchives_ClientRequestId"
ON "InvoiceArchives" ("ClientRequestId")
WHERE "ClientRequestId" IS NOT NULL;
""");

                return;
            }

            migrationBuilder.Sql("""
ALTER TABLE "InvoiceArchives"
ADD COLUMN "ClientRequestId" TEXT NULL;
""");

            migrationBuilder.Sql("""
CREATE UNIQUE INDEX IF NOT EXISTS "IX_InvoiceArchives_ClientRequestId"
ON "InvoiceArchives" ("ClientRequestId")
WHERE "ClientRequestId" IS NOT NULL;
""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
DROP INDEX IF EXISTS "IX_InvoiceArchives_ClientRequestId";
""");

            migrationBuilder.Sql("""
ALTER TABLE "InvoiceArchives"
DROP COLUMN "ClientRequestId";
""");
        }
    }
}

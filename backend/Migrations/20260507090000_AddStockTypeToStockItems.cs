using backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260507090000_AddStockTypeToStockItems")]
    public partial class AddStockTypeToStockItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql("""
ALTER TABLE "StockItems"
ADD COLUMN IF NOT EXISTS "StockType" character varying(20) NOT NULL DEFAULT 'Material';
""");

                migrationBuilder.Sql("""
UPDATE "StockItems"
SET "StockType" = 'Material'
WHERE "StockType" IS NULL;
""");

                migrationBuilder.Sql("""
ALTER TABLE "StockItems" ALTER COLUMN "StockType" SET DEFAULT 'Material';
ALTER TABLE "StockItems" ALTER COLUMN "StockType" SET NOT NULL;
""");

                return;
            }

            migrationBuilder.AddColumn<string>(
                name: "StockType",
                table: "StockItems",
                type: "TEXT",
                nullable: false,
                defaultValue: "Material");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql("""
ALTER TABLE "StockItems" DROP COLUMN IF EXISTS "StockType";
""");

                return;
            }

            migrationBuilder.DropColumn(
                name: "StockType",
                table: "StockItems");
        }
    }
}

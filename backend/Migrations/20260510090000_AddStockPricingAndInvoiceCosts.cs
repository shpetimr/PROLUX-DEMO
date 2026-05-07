using backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260510090000_AddStockPricingAndInvoiceCosts")]
    public partial class AddStockPricingAndInvoiceCosts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql("""
ALTER TABLE "StockItems"
ADD COLUMN IF NOT EXISTS "BuyPrice" numeric(18,2) NOT NULL DEFAULT 0;
""");

                migrationBuilder.Sql("""
ALTER TABLE "StockItems"
ADD COLUMN IF NOT EXISTS "SellPrice" numeric(18,2) NOT NULL DEFAULT 0;
""");

                migrationBuilder.Sql("""
ALTER TABLE "StockMovements"
ADD COLUMN IF NOT EXISTS "UnitCost" numeric(18,2) NULL;
""");

                migrationBuilder.Sql("""
ALTER TABLE "StockMovements"
ADD COLUMN IF NOT EXISTS "CostAmount" numeric(18,2) NULL;
""");

                return;
            }

            migrationBuilder.AddColumn<decimal>(
                name: "BuyPrice",
                table: "StockItems",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SellPrice",
                table: "StockItems",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitCost",
                table: "StockMovements",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CostAmount",
                table: "StockMovements",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql("""
ALTER TABLE "StockMovements" DROP COLUMN IF EXISTS "CostAmount";
ALTER TABLE "StockMovements" DROP COLUMN IF EXISTS "UnitCost";
ALTER TABLE "StockItems" DROP COLUMN IF EXISTS "SellPrice";
ALTER TABLE "StockItems" DROP COLUMN IF EXISTS "BuyPrice";
""");

                return;
            }

            migrationBuilder.DropColumn(
                name: "CostAmount",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "UnitCost",
                table: "StockMovements");

            migrationBuilder.DropColumn(
                name: "SellPrice",
                table: "StockItems");

            migrationBuilder.DropColumn(
                name: "BuyPrice",
                table: "StockItems");
        }
    }
}

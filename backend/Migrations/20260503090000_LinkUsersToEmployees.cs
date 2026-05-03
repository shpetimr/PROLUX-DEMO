using backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260503090000_LinkUsersToEmployees")]
    public partial class LinkUsersToEmployees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql("""
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "EmployeeId" integer NULL;
""");

                migrationBuilder.Sql("""
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Users_EmployeeId" ON "Users" ("EmployeeId") WHERE "EmployeeId" IS NOT NULL;
""");

                migrationBuilder.Sql("""
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'FK_Users_Employees_EmployeeId'
    ) THEN
        ALTER TABLE "Users"
        ADD CONSTRAINT "FK_Users_Employees_EmployeeId"
        FOREIGN KEY ("EmployeeId") REFERENCES "Employees" ("Id") ON DELETE RESTRICT;
    END IF;
END $$;
""");

                return;
            }

            migrationBuilder.AddColumn<int>(
                name: "EmployeeId",
                table: "Users",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.Sql("""
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Users_EmployeeId" ON "Users" ("EmployeeId") WHERE "EmployeeId" IS NOT NULL;
""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL")
            {
                migrationBuilder.Sql("""
ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "FK_Users_Employees_EmployeeId";
""");

                migrationBuilder.Sql("""
DROP INDEX IF EXISTS "IX_Users_EmployeeId";
""");

                migrationBuilder.Sql("""
ALTER TABLE "Users" DROP COLUMN IF EXISTS "EmployeeId";
""");

                return;
            }

            migrationBuilder.Sql("""
DROP INDEX IF EXISTS "IX_Users_EmployeeId";
""");

            migrationBuilder.DropColumn(
                name: "EmployeeId",
                table: "Users");
        }
    }
}

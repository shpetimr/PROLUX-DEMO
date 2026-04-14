using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyWageToEmployee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DailyWage",
                table: "Employees",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 1850m); // Default to Magazine wage

            // Update existing employees with appropriate default daily wages based on their position
            migrationBuilder.Sql("UPDATE Employees SET DailyWage = 1850 WHERE Position = 'Magazine'");
            migrationBuilder.Sql("UPDATE Employees SET DailyWage = 2460 WHERE Position = 'Terren'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DailyWage",
                table: "Employees");
        }
    }
}

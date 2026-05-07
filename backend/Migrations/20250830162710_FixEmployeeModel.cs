using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class FixEmployeeModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var booleanColumnType = migrationBuilder.ActiveProvider == "Npgsql.EntityFrameworkCore.PostgreSQL"
                ? "boolean"
                : "INTEGER";

            migrationBuilder.RenameColumn(
                name: "Penalties",
                table: "Employees",
                newName: "TotalOvertimeHoursThisMonth");

            migrationBuilder.RenameColumn(
                name: "Bonuses",
                table: "Employees",
                newName: "OvertimeRate");

            migrationBuilder.AddColumn<int>(
                name: "AbsentDaysThisMonth",
                table: "Employees",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "CalculatedDailyBonuses",
                table: "Employees",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CalculatedDailyPenalties",
                table: "Employees",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "HalfDaysThisMonth",
                table: "Employees",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyBonuses",
                table: "Employees",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyPenalties",
                table: "Employees",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "AbsenceReason",
                table: "AttendanceRecords",
                type: "TEXT",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DailyBonus",
                table: "AttendanceRecords",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DailyPenalty",
                table: "AttendanceRecords",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsHalfDay",
                table: "AttendanceRecords",
                type: booleanColumnType,
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "OvertimeHours",
                table: "AttendanceRecords",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AbsentDaysThisMonth",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "CalculatedDailyBonuses",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "CalculatedDailyPenalties",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "HalfDaysThisMonth",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "MonthlyBonuses",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "MonthlyPenalties",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "AbsenceReason",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "DailyBonus",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "DailyPenalty",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "IsHalfDay",
                table: "AttendanceRecords");

            migrationBuilder.DropColumn(
                name: "OvertimeHours",
                table: "AttendanceRecords");

            migrationBuilder.RenameColumn(
                name: "TotalOvertimeHoursThisMonth",
                table: "Employees",
                newName: "Penalties");

            migrationBuilder.RenameColumn(
                name: "OvertimeRate",
                table: "Employees",
                newName: "Bonuses");
        }
    }
}

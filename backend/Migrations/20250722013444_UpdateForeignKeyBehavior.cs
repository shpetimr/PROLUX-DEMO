using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateForeignKeyBehavior : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Debts_Users_CreatedById",
                table: "Debts");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Users_CreatedById",
                table: "Projects");

            migrationBuilder.AddForeignKey(
                name: "FK_Debts_Users_CreatedById",
                table: "Debts",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Users_CreatedById",
                table: "Projects",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Debts_Users_CreatedById",
                table: "Debts");

            migrationBuilder.DropForeignKey(
                name: "FK_Projects_Users_CreatedById",
                table: "Projects");

            migrationBuilder.AddForeignKey(
                name: "FK_Debts_Users_CreatedById",
                table: "Debts",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Projects_Users_CreatedById",
                table: "Projects",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}

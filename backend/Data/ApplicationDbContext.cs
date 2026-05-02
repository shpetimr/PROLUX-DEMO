using Microsoft.EntityFrameworkCore;
using backend.Models;
using backend.Utilities;

namespace backend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Employee> Employees { get; set; }
        public DbSet<SalaryRecord> SalaryRecords { get; set; }
        public DbSet<AttendanceRecord> AttendanceRecords { get; set; }
        public DbSet<Expense> Expenses { get; set; }
        public DbSet<Purchase> Purchases { get; set; }
        public DbSet<Rent> Rents { get; set; }
        public DbSet<Income> Incomes { get; set; }
        public DbSet<Debt> Debts { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<StockItem> StockItems { get; set; }
        public DbSet<StockMovement> StockMovements { get; set; }
        public DbSet<WorkerTask> WorkerTasks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Employee configuration
            modelBuilder.Entity<Employee>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.FullName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.BaseSalary).HasColumnType("decimal(18,2)");
                entity.Property(e => e.DailyWage).HasColumnType("decimal(18,2)");
                entity.Property(e => e.MonthlyBonuses).HasColumnType("decimal(18,2)");
                entity.Property(e => e.MonthlyPenalties).HasColumnType("decimal(18,2)");
                entity.Property(e => e.CalculatedDailyBonuses).HasColumnType("decimal(18,2)");
                entity.Property(e => e.CalculatedDailyPenalties).HasColumnType("decimal(18,2)");
                entity.Property(e => e.TotalOvertimeHoursThisMonth).HasColumnType("decimal(18,2)");
                entity.Property(e => e.DailyRate).HasColumnType("decimal(18,2)");
                entity.Property(e => e.OvertimeRate).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Position).HasConversion<string>();
                entity.HasOne(e => e.CreatedBy)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedById)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // SalaryRecord configuration
            modelBuilder.Entity<SalaryRecord>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.BaseSalary).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Bonuses).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Penalties).HasColumnType("decimal(18,2)");
                entity.Property(e => e.TotalSalary).HasColumnType("decimal(18,2)");
                entity.HasOne(e => e.Employee)
                    .WithMany(e => e.SalaryRecords)
                    .HasForeignKey(e => e.EmployeeId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // AttendanceRecord configuration
            modelBuilder.Entity<AttendanceRecord>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Date).IsRequired();
                entity.Property(e => e.IsPresent).IsRequired();
                entity.Property(e => e.Notes).HasMaxLength(500);
                entity.Property(e => e.DailyBonus).HasColumnType("decimal(18,2)");
                entity.Property(e => e.DailyPenalty).HasColumnType("decimal(18,2)");
                entity.Property(e => e.AbsenceReason).HasMaxLength(500);
                entity.Property(e => e.IsHalfDay).IsRequired();
                entity.Property(e => e.OvertimeHours).HasColumnType("decimal(18,2)");
                entity.HasOne(e => e.Employee)
                    .WithMany(e => e.AttendanceRecords)
                    .HasForeignKey(e => e.EmployeeId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                // Create unique index for employee and date combination
                entity.HasIndex(e => new { e.EmployeeId, e.Date }).IsUnique();
            });

            // Expense configuration
            modelBuilder.Entity<Expense>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ExpenseType).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.HasOne(e => e.CreatedBy)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedById)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Purchase configuration
            modelBuilder.Entity<Purchase>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.ItemName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.UnitPrice).HasColumnType("decimal(18,2)");
                entity.Property(e => e.TotalPrice).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.HasOne(e => e.CreatedBy)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedById)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Rent configuration
            modelBuilder.Entity<Rent>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Location).IsRequired().HasMaxLength(200);
                entity.Property(e => e.MonthlyAmount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.HasOne(e => e.CreatedBy)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedById)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Income configuration
            modelBuilder.Entity<Income>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Source).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.HasOne(e => e.CreatedBy)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedById)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // User configuration
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
                entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(100);
                entity.Property(e => e.FullName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Role).HasConversion<string>();
                entity.HasIndex(e => e.Username).IsUnique();
            });

            // Debt configuration
            modelBuilder.Entity<Debt>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.DebtorName).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Type).HasConversion<string>();
                entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.HasOne(e => e.CreatedBy)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedById)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Project configuration
            modelBuilder.Entity<Project>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Content).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Promet).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Expenses).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Profit).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Description).HasMaxLength(1000);
                entity.Property(e => e.Status).HasConversion<string>();
                entity.HasOne(e => e.CreatedBy)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedById)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<StockItem>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Sku).HasMaxLength(100);
                entity.Property(e => e.Unit).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Description).HasMaxLength(500);
                entity.Property(e => e.ReorderLevel).HasColumnType("decimal(18,2)");
                entity.HasMany(e => e.Movements)
                    .WithOne(m => m.StockItem)
                    .HasForeignKey(m => m.StockItemId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<StockMovement>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.QuantityChange).HasColumnType("decimal(18,2)");
                entity.Property(e => e.MovementKind).HasMaxLength(50);
                entity.Property(e => e.Note).HasMaxLength(500);
                entity.HasIndex(e => e.StockItemId);
            });

            modelBuilder.Entity<WorkerTask>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.Deadline).IsRequired();
                entity.Property(e => e.Status).IsRequired().HasConversion<string>();
                entity.HasOne(e => e.AssignedUser)
                    .WithMany()
                    .HasForeignKey(e => e.AssignedUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.CreatedBy)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedById)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasIndex(e => e.AssignedUserId);
                entity.HasIndex(e => e.CreatedById);
            });
        }

        public override int SaveChanges()
        {
            NormalizeTrackedDateTimes();
            return base.SaveChanges();
        }

        public override int SaveChanges(bool acceptAllChangesOnSuccess)
        {
            NormalizeTrackedDateTimes();
            return base.SaveChanges(acceptAllChangesOnSuccess);
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            NormalizeTrackedDateTimes();
            return base.SaveChangesAsync(cancellationToken);
        }

        public override Task<int> SaveChangesAsync(
            bool acceptAllChangesOnSuccess,
            CancellationToken cancellationToken = default)
        {
            NormalizeTrackedDateTimes();
            return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
        }

        private void NormalizeTrackedDateTimes()
        {
            foreach (var entry in ChangeTracker.Entries()
                .Where(entry => entry.State == EntityState.Added || entry.State == EntityState.Modified))
            {
                foreach (var property in entry.Properties)
                {
                    var propertyType = property.Metadata.ClrType;
                    if (propertyType != typeof(DateTime) && propertyType != typeof(DateTime?))
                    {
                        continue;
                    }

                    if (property.CurrentValue is DateTime value)
                    {
                        property.CurrentValue = DateTimeUtc.Normalize(value);
                    }
                }
            }
        }
    }
} 

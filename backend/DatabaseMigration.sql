-- Database Migration Script for Employee Role Field
-- Run this script to update your database

-- Add Role column to Employees table
ALTER TABLE Employees ADD COLUMN Role TEXT DEFAULT 'Simple Worker';

-- Update existing employees based on their position
UPDATE Employees SET Role = 'Simple Worker' WHERE Position = 0; -- Warehouse workers
UPDATE Employees SET Role = 'Simple Worker' WHERE Position = 1; -- Field workers (assuming they were Field before)

-- Update the enum values in the database if needed
-- Note: SQLite doesn't have native enum support, so we store them as integers
-- 0 = Warehouse
-- 1 = FieldWorker (new)
-- 2 = FieldForeman (new)

-- If you need to update existing field workers to the new enum values, you can do:
-- UPDATE Employees SET Position = 1 WHERE Position = 1 AND Role = 'Simple Worker';
-- UPDATE Employees SET Position = 2 WHERE Position = 1 AND Role = 'Foreman';

-- Verify the changes
SELECT Id, FullName, Position, Role, BaseSalary, DaysWorkedThisMonth, Bonuses, Penalties 
FROM Employees 
ORDER BY Id;

-- Add CreatedById columns to existing tables
ALTER TABLE Employees ADD COLUMN CreatedById INTEGER NOT NULL DEFAULT 1;
ALTER TABLE Expenses ADD COLUMN CreatedById INTEGER NOT NULL DEFAULT 1;
ALTER TABLE Purchases ADD COLUMN CreatedById INTEGER NOT NULL DEFAULT 1;
ALTER TABLE Incomes ADD COLUMN CreatedById INTEGER NOT NULL DEFAULT 1;
ALTER TABLE Rents ADD COLUMN CreatedById INTEGER NOT NULL DEFAULT 1;

-- Update existing records to be owned by the admin user (ID 1)
UPDATE Employees SET CreatedById = 1 WHERE CreatedById = 0;
UPDATE Expenses SET CreatedById = 1 WHERE CreatedById = 0;
UPDATE Purchases SET CreatedById = 1 WHERE CreatedById = 0;
UPDATE Incomes SET CreatedById = 1 WHERE CreatedById = 0;
UPDATE Rents SET CreatedById = 1 WHERE CreatedById = 0; 
# SQLite to PostgreSQL Migration

This backend already supports PostgreSQL through `DATABASE_PROVIDER=postgres`.
Use this migration command when moving existing `BusinessManagement.db` data into the configured PostgreSQL database.

## Required environment

Set these in `backend/.env` or host environment variables:

```env
DATABASE_PROVIDER=postgres
SQLITE_CONNECTION_STRING=Data Source=BusinessManagement.db
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

`DATABASE_URL` can also be replaced by the supported `POSTGRES_*` variables from `README.md`.

## Dry run

From the repo root:

```powershell
.\backend\Scripts\Migrate-SqliteToPostgres.ps1
```

Or directly:

```powershell
dotnet run --project .\backend\backend.csproj -- --migrate-sqlite-to-postgres --migration-dry-run
```

Dry run is useful after the PostgreSQL application tables already exist. On a
brand-new empty PostgreSQL database, dry run stops before schema creation by
design. Use the real migration command below for the first run so the schema can
be created before target tables are read.

## Run the migration

Use an empty PostgreSQL database for the cleanest migration:

```powershell
.\backend\Scripts\Migrate-SqliteToPostgres.ps1 -Run
```

The first run connects to PostgreSQL, checks whether the application schema
exists, creates the EF model tables when none exist, validates the SQLite source,
then copies data.

If a previous attempt partially inserted rows, rerun in merge mode:

```powershell
.\backend\Scripts\Migrate-SqliteToPostgres.ps1 -Run -AllowMerge
```

Merge mode inserts only rows whose primary key is missing from PostgreSQL.
It does not overwrite rows that already exist.

After a successful migration, do not rerun the migration normally. The command
aborts when destination application tables contain data to prevent accidental
duplication.

## Verify after migration

Keep `DATABASE_PROVIDER=postgres` in `backend/.env`, then start the backend or
run a maintenance audit:

```powershell
dotnet run --project .\backend\backend.csproj -- --audit-users
dotnet run --project .\backend\backend.csproj
```

Open the app and verify login, employees, attendance, expenses, projects, and
stock records.

## Supabase connection note

If the command fails while resolving or connecting to a direct
`db.*.supabase.co` host, replace `DATABASE_URL` with the Supabase Session Pooler
or Transaction Pooler connection string and rerun the dry run. Some runtimes
cannot reach direct Supabase hosts that only expose IPv6 DNS records.

## What the command checks

- Connects to PostgreSQL before any schema or table reads.
- Detects whether the destination application schema exists.
- Creates the PostgreSQL schema with the current EF model when no application tables exist.
- Verifies SQLite `PRAGMA integrity_check`.
- Verifies SQLite `PRAGMA foreign_key_check`.
- Aborts by default when destination application tables already contain data.
- Copies parent tables before dependent tables to satisfy foreign keys.
- Converts SQLite `DateTime` values to UTC-compatible PostgreSQL timestamps during insert.
- Preserves primary keys and timestamp fields.
- Resets PostgreSQL identity sequences after explicit ID inserts.
- Validates that every source primary key exists in PostgreSQL before committing.

The real migration runs PostgreSQL writes inside a transaction through EF's
PostgreSQL execution strategy. If validation fails, the transaction is rolled
back and the SQLite database is left untouched.

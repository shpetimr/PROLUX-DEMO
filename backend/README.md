# PROLUX Group Management - Backend

A comprehensive .NET Core Web API for managing employee salaries, business expenses, purchases, rent, and income tracking with detailed financial reporting.

## Features

### 🏢 Business Structure

- **Warehouse Employees**: Physical storage and product organization
- **Field Employees**: Sales, transport, installations, etc.
- Different base salaries and bonuses for each position

### 👥 Employee Management

- Full employee registration with position, hire date, and salary
- Track days worked, bonuses, and penalties
- Automatic salary calculation based on position and performance
- Complete CRUD operations for employee records

### 💰 Salary Calculation

- **Formula**: Monthly Salary = Base Salary + Bonuses – Penalties
- Position-based salary calculations
- Daily rate calculations (22 working days per month)
- Salary history tracking

### 📊 Financial Management

- **Expenses**: Fuel, equipment, servicing, maintenance
- **Purchases**: Item tracking with quantity and pricing
- **Rent**: Warehouse, office, storage payments
- **Income**: Product sales, services, consultations

### 📈 Reports & Analytics

- Weekly, monthly, and yearly financial reports
- Dashboard with key performance indicators
- Net profit calculations
- Visual financial trends
- Export capabilities (ready for PDF/Excel integration)

### 🔐 Authentication & Authorization

- JWT-based authentication
- Role-based access control (Admin/User)
- Secure password hashing
- Token validation

## Technology Stack

- **Backend**: .NET 8 LTS Web API
- **Database**: SQLite by default, PostgreSQL-compatible cloud databases by configuration
- **ORM**: Entity Framework Core
- **Authentication**: JWT Bearer Tokens
- **Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites

- .NET 8.0 SDK or later
- Visual Studio 2022 or VS Code

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Restore dependencies**

   ```bash
   dotnet restore
   ```

3. **Create your local environment file**

   ```bash
   copy .env.example .env
   ```

   Set a strong `JWT_KEY` and real admin bootstrap credentials in `backend/.env`.

4. **Provision the admin account**

   ```bash
   dotnet run -- --provision-admin --sanitize-sample-users
   ```

5. **Run the application**

   ```bash
   dotnet run
   ```

6. **Access the API**
   - API Base URL: configured by `ASPNETCORE_URLS`
   - Swagger Documentation: `${ASPNETCORE_URLS}/swagger` in development

### Initial Access

- The application does not create default login credentials.
- The backend refuses to start without a strong JWT signing key and at least one administrator account.
- Provision a real administrator account through your deployment or setup process before first use.
- Use `dotnet run -- --audit-users` to review existing accounts before cleanup.
- Use `dotnet run -- --provision-admin --sanitize-sample-users` to create the admin and rotate/remove placeholder users safely.

## API Endpoints

### Authentication

```
POST /api/auth/login          - User login
POST /api/auth/register       - User registration
POST /api/auth/validate       - Validate JWT token
```

### Employees

```
GET    /api/employees                    - Get all employees
GET    /api/employees/{id}               - Get employee by ID
POST   /api/employees                    - Create new employee
PUT    /api/employees/{id}               - Update employee
DELETE /api/employees/{id}               - Delete employee
GET    /api/employees/positions          - Get available positions
```

### Expenses

```
GET    /api/expenses                     - Get all expenses
GET    /api/expenses/{id}                - Get expense by ID
POST   /api/expenses                     - Create new expense
PUT    /api/expenses/{id}                - Update expense
DELETE /api/expenses/{id}                - Delete expense
GET    /api/expenses/types               - Get expense types
GET    /api/expenses/summary             - Get expense summary
```

### Purchases

```
GET    /api/purchases                    - Get all purchases
GET    /api/purchases/{id}               - Get purchase by ID
POST   /api/purchases                    - Create new purchase
PUT    /api/purchases/{id}               - Update purchase
DELETE /api/purchases/{id}               - Delete purchase
GET    /api/purchases/items              - Get item names
GET    /api/purchases/summary            - Get purchase summary
```

### Rent

```
GET    /api/rents                        - Get all rents
GET    /api/rents/{id}                   - Get rent by ID
POST   /api/rents                        - Create new rent
PUT    /api/rents/{id}                   - Update rent
DELETE /api/rents/{id}                   - Delete rent
GET    /api/rents/locations              - Get locations
GET    /api/rents/summary                - Get rent summary
```

### Income

```
GET    /api/incomes                      - Get all incomes
GET    /api/incomes/{id}                 - Get income by ID
POST   /api/incomes                      - Create new income
PUT    /api/incomes/{id}                 - Update income
DELETE /api/incomes/{id}                 - Delete income
GET    /api/incomes/sources              - Get income sources
GET    /api/incomes/summary              - Get income summary
```

### Reports

```
GET    /api/reports/financial            - Get financial report for period
GET    /api/reports/monthly/{year}/{month} - Get monthly report
GET    /api/reports/yearly/{year}        - Get yearly report
GET    /api/reports/dashboard            - Get dashboard stats
GET    /api/reports/monthly-breakdown/{year} - Get monthly breakdown
GET    /api/reports/current-month        - Get current month report
GET    /api/reports/current-year         - Get current year report
```

## Database Schema

### Core Entities

- **Employees**: Employee information and salary data
- **SalaryRecords**: Monthly salary calculations and history
- **Expenses**: Business expense tracking
- **Purchases**: Purchase transactions with items
- **Rents**: Rental payment tracking
- **Incomes**: Revenue and income sources
- **Users**: Authentication and authorization

### Key Relationships

- Employees → SalaryRecords (One-to-Many)
- All entities include audit fields (CreatedAt, UpdatedAt)

## Configuration

### Environment Variables

Copy `backend/.env.example` to `backend/.env` for local development. Runtime values now come from environment variables; `appsettings.json` only keeps non-secret logging defaults.

- `ASPNETCORE_ENVIRONMENT`: Set to "Development" or "Production"
- `PROLUX_BACKEND_SCHEME`, `PROLUX_BACKEND_HOST`, `PROLUX_BACKEND_PORT`: Backend bind URL parts used when `ASPNETCORE_URLS` is not set
- `ASPNETCORE_URLS`: Optional full backend bind URL; can be composed from the `PROLUX_BACKEND_*` variables in `.env`
- `CORS_ALLOWED_ORIGINS`: Comma-separated browser origins allowed to call the API
- `DATABASE_PROVIDER`: Database provider. Use `sqlite` locally or `postgres` for PostgreSQL/Supabase.
- `SQLITE_CONNECTION_STRING`: SQLite connection string for the local database. Used when `DATABASE_PROVIDER=sqlite`.
- `DATABASE_URL`: PostgreSQL URL for cloud databases when `DATABASE_PROVIDER=postgres`.
- `DATABASE_CONNECTION_STRING`, `POSTGRES_CONNECTION_STRING`, `POSTGRESQL_CONNECTION_STRING`, `POSTGRES_URL`: Alternative backend-only connection string names.
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: Optional split PostgreSQL credentials if you do not want to store one full URL.
- `POSTGRES_SSL_MODE`, `POSTGRES_TRUST_SERVER_CERTIFICATE`: Optional PostgreSQL TLS settings. External hosts default to `SSL Mode=Require`.
- `JWT_KEY`: Required. Use a long random secret, preferably 32 random bytes encoded as Base64Url or 64 hex characters
- `JWT_ISSUER`: Required token issuer
- `JWT_AUDIENCE`: Required token audience
- `ADMIN_USERNAME`: Required for `--provision-admin` and `--reset-admin-password`
- `ADMIN_FULL_NAME`: Required only for `--provision-admin`
- `ADMIN_PASSWORD`: Required for `--provision-admin` and used as the new password for `--reset-admin-password`

### Security Maintenance Commands

```bash
dotnet run -- --audit-users
dotnet run -- --provision-admin
dotnet run -- --reset-admin-password
dotnet run -- --provision-admin --sanitize-sample-users
dotnet run -- --reset-production-data
dotnet run -- --reset-production-data --confirm-production-reset
```

- `--audit-users`: Lists current users, flags placeholder/sample accounts, and reports legacy password hashes
- `--provision-admin`: Creates or updates the admin account from `backend/.env`
- `--reset-admin-password`: Updates the password hash for the existing admin named by `ADMIN_USERNAME`; it does not create users or promote non-admin accounts
- `--sanitize-sample-users`: Deletes unreferenced placeholder users and rotates referenced ones to non-loginable retired accounts
- `--reset-production-data`: Maintenance-mode dry run for pre-production cleanup. It prints the business records and non-preserved users that would be removed, then exits without starting the API.
- `--confirm-production-reset`: Applies `--reset-production-data`. This is destructive and should only be used after reviewing the dry run and taking a backup.

To change an existing admin password, set `ADMIN_USERNAME` to the current admin
username and set `ADMIN_PASSWORD` to the new strong password. Then run:

```bash
dotnet run -- --reset-admin-password
```

The reset command uses the same PBKDF2 password hashing and password-strength
rules as normal account creation, leaves the existing admin account in place,
and fails instead of creating a duplicate admin when the username is wrong.

### Pre-Production Data Reset

Use this only to remove development, testing, or demo data before the system is
handed over for real production use. It does not drop schema, delete migrations,
or change the authentication/authorization model.

Dry run first:

```bash
dotnet run -- --reset-production-data
```

Apply after review:

```bash
dotnet run -- --reset-production-data --confirm-production-reset
```

Recommended first-time production handover:

```bash
dotnet run -- --provision-admin --reset-production-data --confirm-production-reset
```

The reset preserves the configured active administrator account from
`ADMIN_USERNAME`. If `ADMIN_USERNAME` is not set, the command only proceeds when
there is exactly one active admin account; otherwise it fails and asks you to set
`ADMIN_USERNAME` so it cannot preserve the wrong user.

Cleaned data includes worker tasks, work sales, invoice archives, invoice stock
deductions, stock items and movements, salary records, attendance records,
expenses, purchases, rents, incomes, debts, projects, employees, and all users
except the preserved admin account. Report screens are reset because reports are
calculated from these cleared business records.

Before applying the reset, create a verified database backup. SQLite databases
receive an automatic local backup file; PostgreSQL/Supabase databases require an
external backup from the host/provider before running the confirmed command.

## Data

The application no longer creates demo business records automatically. Use the maintenance commands above to audit or sanitize legacy placeholder user accounts when needed.

## Security Features

- **Password Hashing**: PBKDF2-HMAC-SHA256 with per-password salt
- **JWT Authentication**: Secure token-based authentication
- **CORS Configuration**: Configurable cross-origin requests
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Entity Framework parameterized queries

## Development

### Adding New Features

1. Create model in `Models/` directory
2. Add DTOs in `DTOs/` directory
3. Create service interface and implementation
4. Add controller with CRUD operations
5. Update database context if needed
6. Add to dependency injection in `Program.cs`

### Database Migrations

```bash
# Create migration
dotnet ef migrations add MigrationName

# Update database
dotnet ef database update
```

### Cloud Database Setup

The backend database provider is selected in `backend/.env` or in host-managed environment variables. Keep database credentials out of `frontend/.env`; the frontend should only know the API URL.

Local SQLite:

```env
DATABASE_PROVIDER=sqlite
SQLITE_CONNECTION_STRING=Data Source=BusinessManagement.db
```

Cloud PostgreSQL/Supabase:

```env
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

If a Supabase direct `db.*.supabase.co` host only has IPv6 DNS records from your runtime network, use the Supabase Session Pooler or Transaction Pooler connection string instead.

Split PostgreSQL variables are also supported:

```env
DATABASE_PROVIDER=postgres
POSTGRES_HOST=host
POSTGRES_PORT=5432
POSTGRES_DATABASE=database
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_SSL_MODE=Require
```

The current application uses Entity Framework Core through `ApplicationDbContext`, so controllers and services do not need provider-specific code. PostgreSQL connections are normalized with SSL for external hosts, connection pooling, timeouts, keepalive, and EF retry-on-failure. The SQLite-only legacy stock-table bootstrap is skipped for PostgreSQL. For an empty cloud database, the startup schema creation path can create the current model; for long-term production migrations, generate provider-specific EF migrations with `DATABASE_PROVIDER=postgres` before switching startup to a migrations-only release flow.

## Production Deployment

For the selected production stack, deploy this backend as a Railway service with
service root `/backend`. Railway uses the included `Dockerfile` and
`railway.toml`; generate a public Railway domain, then set Netlify's
`REACT_APP_API_URL` to `https://<railway-domain>/api`.

Railway provides `PORT` automatically. If no explicit `ASPNETCORE_URLS` or
`PROLUX_BACKEND_*` bind URL is configured, the backend listens on
`http://0.0.0.0:$PORT`.

Use `backend/.env.production.example` and the root `DEPLOYMENT.md` for the exact
Railway, Supabase, and Netlify variables.

The backend targets `net8.0`, a supported LTS release.

### Security Checklist

- [ ] Change JWT secret key
- [ ] Store the JWT key only in environment variables or `.env`
- [ ] Configure HTTPS
- [ ] Set up proper CORS policies
- [ ] Use environment-specific connection strings
- [ ] Provision the admin account before first start
- [ ] Enable logging and monitoring
- [ ] Configure backup strategies

### Performance Optimization

- [ ] Enable Entity Framework query caching
- [ ] Implement pagination for large datasets
- [ ] Add database indexes for frequently queried fields
- [ ] Consider caching for reports and summaries

## API Response Format

### Success Response

```json
{
  "id": 1,
  "fullName": "John Smith",
  "position": "Warehouse",
  "baseSalary": 2500.0,
  "monthlySalary": 2700.0
}
```

### Error Response

```json
{
  "message": "Employee not found"
}
```

## Frontend Integration

This backend is designed to work with:

- **Electron.js + React** applications
- **Web applications** (Angular, Vue.js, etc.)
- **Mobile applications** (React Native, Flutter, etc.)

### CORS Configuration

The API reads allowed origins from `CORS_ALLOWED_ORIGINS` or `PROLUX_FRONTEND_*`.
For production, set `CORS_ALLOWED_ORIGINS` to the exact Netlify origin.

## Support

For questions or issues:

1. Check the Swagger documentation at `/swagger`
2. Review the API endpoints and request/response formats
3. Check the API logs and database records for reference
4. Ensure proper authentication headers are included

## License

This project is licensed under the MIT License.

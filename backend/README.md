# Business Management System - Backend

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

- **Backend**: .NET Core 7.0 Web API
- **Database**: SQLite (lightweight, local)
- **ORM**: Entity Framework Core
- **Authentication**: JWT Bearer Tokens
- **Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites

- .NET 7.0 SDK or later
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

3. **Run the application**

   ```bash
   dotnet run
   ```

4. **Access the API**
   - API Base URL: `https://localhost:7001` or `http://localhost:5000`
   - Swagger Documentation: `https://localhost:7001/swagger`

### Default Admin Account

- **Username**: `admin`
- **Password**: `admin123`

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

### appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=BusinessManagement.db"
  },
  "Jwt": {
    "Key": "your-super-secret-jwt-key-here-change-this-in-production"
  }
}
```

### Environment Variables

- `ASPNETCORE_ENVIRONMENT`: Set to "Development" or "Production"
- `JWT_KEY`: Override JWT secret key for production

## Sample Data

The application includes sample data for testing:

- Admin user (admin/admin123)
- 3 sample employees (Warehouse and Field positions)
- Sample expenses, purchases, rents, and incomes
- Realistic financial data for testing reports

## Security Features

- **Password Hashing**: SHA256 with salt
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

## Production Deployment

### Security Checklist

- [ ] Change JWT secret key
- [ ] Configure HTTPS
- [ ] Set up proper CORS policies
- [ ] Use environment-specific connection strings
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

The API is configured to allow all origins for development. For production, configure specific origins in `Program.cs`.

## Support

For questions or issues:

1. Check the Swagger documentation at `/swagger`
2. Review the API endpoints and request/response formats
3. Check the sample data for reference
4. Ensure proper authentication headers are included

## License

This project is licensed under the MIT License.

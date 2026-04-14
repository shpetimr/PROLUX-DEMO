# Business Management System - Frontend

A modern desktop application built with Electron, React, Ant Design, and Tailwind CSS for comprehensive business management.

## Features

### 🏢 Business Structure

- **Warehouse Employees**: Manage employees working in physical storage and product organization
- **Field Employees**: Manage employees working outside (sales, transport, installations, etc.)
- Different base salaries and bonuses for each group
- Additional specific costs tracking (e.g., travel for field workers)

### 👥 Employee Management

- Full employee registration with name, position, hire date
- Base salary management based on position
- Track worked days per month
- Bonuses and penalties management
- Edit or delete employee records
- Automatic salary calculation

### 💰 Salary Calculation

- Monthly salary calculation based on:
  - Employee position (warehouse vs field)
  - Number of days worked
  - Bonuses and penalties
- Formula: `Monthly Salary = Base Salary + Bonuses – Penalties`

### 📦 Financial Management

- **Expenses**: Track fuel, equipment, servicing, maintenance, etc.
- **Purchases**: Manage purchased items with quantity and unit price
- **Rent**: Track rental payments for warehouse, office, storage
- **Income**: Record all business income from various sources

### 📊 Reports & Analytics

- Weekly, monthly, and yearly financial reports
- Total paid salaries, expenses, rent, income tracking
- Net profit calculation: `Income – (Salaries + Expenses + Rent + Purchases)`
- Export to PDF or Excel
- Visual financial trends and statistics

### 🔐 Authentication

- Secure login system
- JWT token-based authentication
- Admin-only access to sensitive operations

## Technology Stack

- **Frontend Framework**: React 18
- **Desktop App**: Electron
- **UI Library**: Ant Design
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Date Handling**: Day.js
- **Routing**: React Router DOM

## Installation

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start Development Server**

   ```bash
   npm start
   ```

3. **Run Desktop Application**
   ```bash
   npm run electron
   ```

## Project Structure

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   └── Layout.js          # Main layout with sidebar navigation
│   ├── pages/
│   │   ├── LoginPage.js       # Authentication page
│   │   ├── Dashboard.js       # Overview dashboard
│   │   ├── Employees.js       # Employee management
│   │   ├── Expenses.js        # Expense tracking
│   │   ├── Purchases.js       # Purchase management
│   │   ├── Rents.js          # Rent payment tracking
│   │   ├── Incomes.js        # Income recording
│   │   └── Reports.js        # Financial reports
│   ├── App.js                # Main app with routing
│   └── index.js              # Entry point
├── package.json
└── README.md
```

## API Integration

The frontend connects to the .NET Core backend API running on `http://localhost:5069`:

- **Authentication**: `/api/auth/login`
- **Employees**: `/api/employees`
- **Expenses**: `/api/expenses`
- **Purchases**: `/api/purchases`
- **Rents**: `/api/rents`
- **Incomes**: `/api/incomes`
- **Reports**: `/api/reports`

## Key Features

### Dashboard

- Real-time business overview
- Key performance indicators
- Quick action buttons
- Financial summary cards

### Employee Management

- CRUD operations for employees
- Position-based salary management
- Automatic salary calculation
- Filtering and sorting capabilities

### Financial Tracking

- Comprehensive expense management
- Purchase tracking with automatic totals
- Rent payment management
- Income recording from multiple sources

### Reporting

- Flexible date range selection
- Multiple report types (weekly/monthly/yearly)
- Export functionality (PDF/Excel)
- Detailed breakdowns and analytics

## Usage

1. **Login**: Use default credentials `admin / admin123`
2. **Navigate**: Use the sidebar to access different modules
3. **Manage Data**: Add, edit, or delete records using the interface
4. **Generate Reports**: Select date ranges and export financial reports
5. **Logout**: Use the logout button in the top-right corner

## Development

### Available Scripts

- `npm start`: Start React development server
- `npm run electron`: Launch Electron desktop app
- `npm run build`: Build for production
- `npm test`: Run tests

### Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_API_URL=http://localhost:5069
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

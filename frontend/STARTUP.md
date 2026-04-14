# Business Management System - Startup Guide

## Quick Start

This guide will help you get the complete Business Management System running with both backend and frontend.

## Prerequisites

- **.NET 7.0 SDK** - [Download here](https://dotnet.microsoft.com/download/dotnet/7.0)
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **SQLite** (included with .NET)

## Step 1: Start the Backend

1. **Open a terminal/command prompt**
2. **Navigate to the backend directory:**

   ```bash
   cd C:\Users\Ylli\Desktop\pllakat\backend
   ```

3. **Run the backend:**

   ```bash
   dotnet run
   ```

4. **Verify the backend is running:**
   - You should see output indicating the server is running on `http://localhost:5069`
   - The API will be available at `http://localhost:5069/api`

## Step 2: Start the Frontend

1. **Open a new terminal/command prompt**
2. **Navigate to the frontend directory:**

   ```bash
   cd C:\Users\Ylli\Desktop\pllakat\frontend
   ```

3. **Start the React development server:**

   ```bash
   npm start
   ```

4. **Verify the frontend is running:**
   - React app should open in your browser at `http://localhost:3000`
   - You should see the login page

## Step 3: Run as Desktop Application

1. **In the frontend directory, run:**

   ```bash
   npm run electron
   ```

2. **The Electron desktop app will launch**
   - This provides a native desktop experience
   - All functionality is the same as the web version

## Step 4: Login and Explore

1. **Login with default credentials:**

   - Username: `admin`
   - Password: `admin123`

2. **Navigate through the system:**
   - **Dashboard**: Overview of business metrics
   - **Employees**: Manage warehouse and field employees (with authentication)
   - **Expenses**: Track business expenses
   - **Purchases**: Manage inventory purchases
   - **Rent**: Track rental payments
   - **Income**: Record business revenue
   - **Reports**: Generate financial reports

## Recent Updates

### API Standardization

- All API calls now use centralized configuration (`src/config/api.js`)
- Automatic authentication header injection
- Consistent error handling across all components
- Standardized data formats (Position as numbers: 0=Warehouse, 1=Field)

### Authentication

- All employee operations require authentication
- Automatic redirect to login on authentication failure
- Token-based authentication with automatic renewal

## Features Available

### Employee Management

- Add warehouse and field employees
- Set base salaries and bonuses
- Track worked days
- Calculate monthly salaries

### Financial Tracking

- Record expenses (fuel, equipment, maintenance)
- Track purchases with automatic totals
- Manage rental payments
- Record income from various sources

### Reporting

- Generate weekly/monthly/yearly reports
- Export to PDF or Excel
- View financial breakdowns
- Monitor profit margins

## Troubleshooting

### Backend Issues

- **Port already in use**: Change the port in `appsettings.json`
- **Database errors**: Delete `backend.db` and restart (will recreate with sample data)
- **Build errors**: Run `dotnet restore` then `dotnet build`

### Frontend Issues

- **Port 3000 in use**: React will automatically suggest an alternative port
- **Dependencies missing**: Run `npm install`
- **Electron not working**: Ensure Node.js is properly installed

### Connection Issues

- **Frontend can't connect to backend**: Ensure backend is running on port 5069
- **CORS errors**: Backend is configured to allow requests from localhost:3000

## Development Mode

### Backend Development

- Backend will automatically reload when you make changes
- Database changes require restart
- Check console for detailed error messages

### Frontend Development

- React will hot-reload when you make changes
- Electron will reload when you save changes
- Check browser console for errors

## Production Deployment

### Backend

1. Build: `dotnet publish -c Release`
2. Deploy the published files to your server
3. Configure environment variables

### Frontend

1. Build: `npm run build`
2. Deploy the `build` folder to your web server
3. For desktop distribution, use Electron Builder

## Support

If you encounter any issues:

1. Check the console/terminal for error messages
2. Verify all prerequisites are installed
3. Ensure both backend and frontend are running
4. Check network connectivity between services

## Default Data

The system comes with sample data:

- Admin user (admin/admin123)
- Sample employees (warehouse and field)
- Sample financial records

You can start using the system immediately or clear the data and start fresh.

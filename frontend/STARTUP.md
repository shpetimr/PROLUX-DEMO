# PROLUX Group Management - Startup Guide

## Quick Start

This guide will help you get the complete PROLUX Group management application running with both backend and frontend.

## Prerequisites

- **.NET 7.0 SDK** - [Download here](https://dotnet.microsoft.com/download/dotnet/7.0)
- **Node.js 16+** - [Download here](https://nodejs.org/)
- **SQLite** (included with .NET)

## Build and Test Checks

Run these from the `frontend` directory:

```bash
npm run check
```

This builds the backend, builds the frontend, and runs the frontend test command in CI mode. For the desktop package flow, use:

```bash
npm run build-electron
```

The Electron backend bundle is published to `artifacts/backend-publish` so generated files stay outside the backend project tree.

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
   - You should see output indicating the server is running on the `ASPNETCORE_URLS` value from `backend/.env`
   - The API will be available at that URL plus `/api`

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
   - React app should open in your browser at the `PORT` value from `frontend/.env`
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

1. **Login with a provisioned account:**

   - Use credentials created by your administrator or deployment process

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
- **Database errors**: Delete `backend.db` and restart (the schema will be recreated)
- **Build errors**: Run `dotnet restore` then `dotnet build`

### Frontend Issues

- **Frontend port in use**: Update `PORT` and `PROLUX_FRONTEND_DEV_URL` in `frontend/.env`
- **Dependencies missing**: Run `npm install`
- **Electron not working**: Ensure Node.js is properly installed

### Connection Issues

- **Frontend can't connect to backend**: Ensure `REACT_APP_API_URL` or the `PROLUX_BACKEND_*` variables point to the running API
- **CORS errors**: Ensure `CORS_ALLOWED_ORIGINS` or `PROLUX_FRONTEND_*` matches the frontend origin

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

The system does not create sample business records or default login credentials automatically.

You can start using the system immediately or clear the data and start fresh.

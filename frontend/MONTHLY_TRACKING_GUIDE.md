# Monthly Tracking System - Implementation Guide

## Overview

The Monthly Tracking System is a comprehensive financial tracking solution that allows you to monitor all financial aspects of your business for any date range. It tracks expenses, purchases, rents, incomes, and employee payments with detailed breakdowns and summaries.

## Features Implemented

### 1. Flexible Date Range Tracking

- **Current Month**: Automatically loads data for the current month
- **Custom Range**: Select any start and end date (e.g., June 1-30, 2025)
- **Specific Month**: Choose a specific year and month
- **Year Overview**: View data for an entire year

### 2. Comprehensive Financial Data

- **Expenses**: Track all expenses with breakdown by type
- **Purchases**: Monitor purchases by category
- **Rents**: Track rental income by location
- **Incomes**: Monitor income sources
- **Employee Payments**: Track salaries, bonuses, and penalties by position

### 3. Detailed Analytics

- **Summary Statistics**: Total income, expenses, net profit, and profit margin
- **Breakdown Tables**: Detailed breakdowns by category/type
- **Transaction Lists**: Recent transactions for each category
- **Visual Indicators**: Color-coded profit/loss indicators

## Backend API Endpoints

The system connects to these backend endpoints:

```javascript
// API Endpoints for Monthly Tracking
MONTHLY_TRACKING: {
  CUSTOM_RANGE: "/reports/monthly-tracking",
  BY_MONTH: (year, month) => `/reports/monthly-tracking/${year}/${month}`,
  BY_YEAR: (year) => `/reports/monthly-tracking/year/${year}`,
  CURRENT_MONTH: "/reports/monthly-tracking/current-month",
  CURRENT_YEAR: "/reports/monthly-tracking/current-year",
  SUMMARY: "/reports/monthly-tracking/summary",
  CUSTOM_REQUEST: "/reports/monthly-tracking/custom",
}
```

## Expected Backend Response Structure

The backend should return data in this format:

```json
{
  "summary": {
    "totalIncome": 150000,
    "totalExpenses": 85000,
    "netProfit": 65000,
    "profitMargin": 43.3
  },
  "expenses": {
    "breakdown": [
      {
        "type": "Materiale",
        "amount": 30000,
        "percentage": 35.3
      }
    ],
    "transactions": [
      {
        "description": "Blerja e materialeve",
        "amount": 15000,
        "date": "2025-06-15"
      }
    ]
  },
  "purchases": {
    "breakdown": [
      {
        "category": "Materiale ndërtimi",
        "amount": 20000,
        "percentage": 40.0
      }
    ]
  },
  "incomes": {
    "breakdown": [
      {
        "source": "Projekte ndërtimi",
        "amount": 100000,
        "percentage": 66.7
      }
    ],
    "transactions": [
      {
        "source": "Projekti A",
        "amount": 50000,
        "date": "2025-06-10"
      }
    ]
  },
  "rents": {
    "breakdown": [
      {
        "location": "Tirana",
        "amount": 12000,
        "percentage": 60.0
      }
    ]
  },
  "employeePayments": {
    "breakdown": [
      {
        "position": "Inxhinier",
        "baseSalary": 15000,
        "bonuses": 2000,
        "penalties": 0,
        "total": 17000
      }
    ]
  }
}
```

## Frontend Components

### 1. MonthlyTracking Component (`src/components/MonthlyTracking.js`)

Main component that handles all monthly tracking functionality.

**Key Features:**

- Date range selection
- Multiple tracking types (current month, custom range, specific month, year)
- Real-time data fetching
- Comprehensive data display
- Error handling and loading states

### 2. MonthlyTrackingTest Component (`src/components/MonthlyTrackingTest.js`)

Test component with mock data for development and testing.

**Usage:**

- Import and use for testing without backend
- Demonstrates expected data structure
- Useful for UI development and debugging

## Integration with Reports Page

The Monthly Tracking system is integrated into the Reports page with a tabbed interface:

```javascript
// In src/pages/Reports.js
<Tabs
  defaultActiveKey="general"
  items={[
    {
      key: "general",
      label: "Statistikat e Përgjithshme",
      children: renderGeneralStatistics(),
    },
    {
      key: "monthly-tracking",
      label: "Gjurmimi Mujor",
      children: <MonthlyTracking />,
    },
  ]}
/>
```

## Usage Examples

### 1. Track Current Month

```javascript
// Automatically loads current month data
<MonthlyTracking />
```

### 2. Track Custom Date Range

```javascript
// User selects date range in the UI
// Example: June 1-30, 2025
const dateRange = [dayjs("2025-06-01"), dayjs("2025-06-30")];
```

### 3. Track Specific Month

```javascript
// User selects specific year and month
const year = 2025;
const month = 6; // June
```

### 4. Track Entire Year

```javascript
// User selects specific year
const year = 2025;
```

## API Integration Examples

### 1. Custom Date Range Request

```javascript
const fetchCustomRangeData = async () => {
  const startDate = dateRange[0].format("YYYY-MM-DD");
  const endDate = dateRange[1].format("YYYY-MM-DD");

  const response = await apiClient.get(
    `${API_ENDPOINTS.MONTHLY_TRACKING.CUSTOM_RANGE}?startDate=${startDate}&endDate=${endDate}`
  );
  return response.data;
};
```

### 2. Specific Month Request

```javascript
const fetchSpecificMonthData = async () => {
  const response = await apiClient.get(
    API_ENDPOINTS.MONTHLY_TRACKING.BY_MONTH(selectedYear, selectedMonth)
  );
  return response.data;
};
```

### 3. Current Month Request

```javascript
const fetchCurrentMonthData = async () => {
  const response = await apiClient.get(
    API_ENDPOINTS.MONTHLY_TRACKING.CURRENT_MONTH
  );
  return response.data;
};
```

## Data Display Features

### 1. Summary Cards

- Total Income (green)
- Total Expenses (red)
- Net Profit (green/red based on value)
- Profit Margin (percentage)

### 2. Detailed Breakdowns

- **Expenses**: Breakdown by type (Materiale, Paga, Shërbime, etc.)
- **Purchases**: Breakdown by category (Materiale ndërtimi, Mjete, etc.)
- **Incomes**: Breakdown by source (Projekte, Shërbime, Qira, etc.)
- **Rents**: Breakdown by location (Tirana, Durrës, etc.)
- **Employee Payments**: Breakdown by position with salary details

### 3. Transaction Tables

- Recent transactions for each category
- Pagination for large datasets
- Formatted currency display

## Error Handling

The system includes comprehensive error handling:

```javascript
try {
  const response = await apiClient.get(endpoint);
  setMonthlyData(response.data);
} catch (error) {
  console.error("Error fetching data:", error);
  message.error("Dështoi të merren të dhënat");
} finally {
  setLoading(false);
}
```

## Currency Formatting

All monetary values are formatted using Albanian locale:

```javascript
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("sq-AL", {
    style: "currency",
    currency: "ALL",
  }).format(amount || 0);
};
```

## Responsive Design

The component is fully responsive with:

- Mobile-first design
- Responsive grid layout
- Collapsible sections for mobile
- Touch-friendly controls

## Testing

### 1. Unit Testing

Use the `MonthlyTrackingTest` component to test the UI without backend integration.

### 2. Integration Testing

Test with real backend endpoints to ensure proper data flow.

### 3. Manual Testing

- Test all date range options
- Verify data display accuracy
- Test error scenarios
- Verify responsive behavior

## Future Enhancements

### 1. Export Functionality

- PDF export of reports
- Excel export of data
- Email reports

### 2. Advanced Analytics

- Trend analysis
- Comparative reports
- Forecasting

### 3. Real-time Updates

- WebSocket integration
- Live data updates
- Notifications

### 4. Custom Dashboards

- User-defined widgets
- Saved reports
- Personalized views

## Troubleshooting

### Common Issues

1. **API Connection Errors**

   - Check backend URL configuration
   - Verify authentication tokens
   - Check CORS settings

2. **Data Display Issues**

   - Verify response data structure
   - Check date formatting
   - Validate currency formatting

3. **Performance Issues**
   - Implement data caching
   - Use pagination for large datasets
   - Optimize API calls

### Debug Mode

Enable debug logging:

```javascript
console.log("API Request:", {
  method: config.method?.toUpperCase(),
  url: config.url,
  hasToken: !!token,
  data: config.data,
});
```

## Conclusion

The Monthly Tracking System provides a comprehensive solution for financial monitoring with flexible date ranges, detailed breakdowns, and user-friendly interface. It seamlessly integrates with your existing backend API and provides valuable insights into your business finances.

For support or questions, refer to the backend API documentation and ensure all endpoints are properly implemented according to the expected response structure.

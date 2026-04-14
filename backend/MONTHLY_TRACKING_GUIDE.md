# Monthly Tracking System - Backend Implementation

## Overview

This document describes the new monthly tracking functionality implemented in the backend API. The system allows you to track expenses, purchases, rent, income, and employee payments/salaries for specific date ranges (e.g., June 1-30, 2025).

## Features

### 1. Monthly Tracking with Date Ranges
- **Custom Date Ranges**: Track financial data for any specific period
- **Monthly Reports**: Get comprehensive reports for specific months
- **Yearly Overview**: Get all months for a specific year
- **Current Period Tracking**: Get data for current month/year

### 2. Comprehensive Data Tracking
- **Expenses**: Track all expenses with breakdowns by type
- **Purchases**: Track all purchases with item categories
- **Rent**: Track rent payments by location
- **Income**: Track income by source
- **Employee Payments**: Track salaries, bonuses, and penalties

### 3. Detailed Breakdowns
- **By Category**: Group data by expense type, purchase category, rent location, income source
- **By Position**: Group employee payments by position
- **Summary Statistics**: Net profit, profit margin, total transactions

## API Endpoints

### 1. Monthly Tracking with Custom Date Range
```
GET /api/reports/monthly-tracking?startDate={date}&endDate={date}&includeDetails={bool}&includeBreakdowns={bool}
```

**Parameters:**
- `startDate`: Start date (e.g., "2025-06-01")
- `endDate`: End date (e.g., "2025-06-30")
- `includeDetails`: Include detailed item lists (default: true)
- `includeBreakdowns`: Include category breakdowns (default: true)

**Example:**
```
GET /api/reports/monthly-tracking?startDate=2025-06-01&endDate=2025-06-30
```

### 2. Monthly Tracking by Year/Month
```
GET /api/reports/monthly-tracking/{year}/{month}?includeDetails={bool}&includeBreakdowns={bool}
```

**Example:**
```
GET /api/reports/monthly-tracking/2025/6
```

### 3. Yearly Tracking
```
GET /api/reports/monthly-tracking/year/{year}?includeDetails={bool}&includeBreakdowns={bool}
```

**Example:**
```
GET /api/reports/monthly-tracking/year/2025
```

### 4. Current Month Tracking
```
GET /api/reports/monthly-tracking/current-month?includeDetails={bool}&includeBreakdowns={bool}
```

### 5. Current Year Tracking
```
GET /api/reports/monthly-tracking/current-year?includeDetails={bool}&includeBreakdowns={bool}
```

### 6. Monthly Tracking Summary
```
GET /api/reports/monthly-tracking/summary?startDate={date}&endDate={date}
```

### 7. Custom Monthly Tracking (POST)
```
POST /api/reports/monthly-tracking/custom
```

**Request Body:**
```json
{
  "startDate": "2025-06-01",
  "endDate": "2025-06-30",
  "includeDetails": true,
  "includeBreakdowns": true
}
```

## Response Structure

### MonthlyTrackingDto
```json
{
  "startDate": "2025-06-01T00:00:00",
  "endDate": "2025-06-30T23:59:59",
  "periodName": "June 2025",
  "expenses": {
    "totalAmount": 15000.00,
    "totalCount": 25,
    "items": [...],
    "byType": {
      "Utilities": 5000.00,
      "Office": 3000.00,
      "Transport": 7000.00
    }
  },
  "purchases": {
    "totalAmount": 8000.00,
    "totalCount": 15,
    "items": [...],
    "byCategory": {
      "Equipment": 5000.00,
      "Supplies": 3000.00
    }
  },
  "rent": {
    "totalAmount": 5000.00,
    "totalCount": 2,
    "items": [...],
    "byLocation": {
      "Office A": 3000.00,
      "Warehouse": 2000.00
    }
  },
  "income": {
    "totalAmount": 50000.00,
    "totalCount": 30,
    "items": [...],
    "bySource": {
      "Project A": 30000.00,
      "Project B": 20000.00
    }
  },
  "employeePayments": {
    "totalSalaries": 12000.00,
    "totalBonuses": 2000.00,
    "totalPenalties": 500.00,
    "netPayments": 13500.00,
    "totalEmployees": 5,
    "totalDaysWorked": 110,
    "employeePayments": [...],
    "byPosition": {
      "Magazine": 8000.00,
      "Terren": 5500.00
    }
  },
  "summary": {
    "totalIncome": 50000.00,
    "totalExpenses": 15000.00,
    "totalOutflow": 41500.00,
    "netProfit": 8500.00,
    "profitMargin": 17.00,
    "totalTransactions": 87
  },
  "currencyCode": "MKD",
  "currencySymbol": "MKD"
}
```

## Frontend Integration Examples

### 1. React Component Example
```jsx
import React, { useState, useEffect } from 'react';

const MonthlyTracking = () => {
  const [trackingData, setTrackingData] = useState(null);
  const [startDate, setStartDate] = useState('2025-06-01');
  const [endDate, setEndDate] = useState('2025-06-30');

  const fetchMonthlyTracking = async () => {
    try {
      const response = await fetch(
        `/api/reports/monthly-tracking?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = await response.json();
      setTrackingData(data);
    } catch (error) {
      console.error('Error fetching monthly tracking:', error);
    }
  };

  useEffect(() => {
    fetchMonthlyTracking();
  }, [startDate, endDate]);

  return (
    <div>
      <h2>Monthly Tracking: {trackingData?.periodName}</h2>
      
      <div className="date-selector">
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)} 
        />
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)} 
        />
      </div>

      {trackingData && (
        <div className="tracking-summary">
          <div className="summary-card">
            <h3>Income</h3>
            <p>{trackingData.income.totalAmount} MKD</p>
          </div>
          <div className="summary-card">
            <h3>Expenses</h3>
            <p>{trackingData.expenses.totalAmount} MKD</p>
          </div>
          <div className="summary-card">
            <h3>Net Profit</h3>
            <p>{trackingData.summary.netProfit} MKD</p>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 2. Date Range Picker Component
```jsx
const DateRangePicker = ({ onDateChange }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleDateChange = () => {
    if (startDate && endDate) {
      onDateChange(startDate, endDate);
    }
  };

  return (
    <div className="date-range-picker">
      <input
        type="date"
        value={startDate}
        onChange={(e) => {
          setStartDate(e.target.value);
          handleDateChange();
        }}
        placeholder="Start Date"
      />
      <input
        type="date"
        value={endDate}
        onChange={(e) => {
          setEndDate(e.target.value);
          handleDateChange();
        }}
        placeholder="End Date"
      />
    </div>
  );
};
```

### 3. Financial Summary Dashboard
```jsx
const FinancialSummary = ({ trackingData }) => {
  if (!trackingData) return null;

  return (
    <div className="financial-summary">
      <div className="summary-grid">
        <div className="summary-item income">
          <h4>Total Income</h4>
          <p>{trackingData.income.totalAmount} MKD</p>
        </div>
        <div className="summary-item expenses">
          <h4>Total Expenses</h4>
          <p>{trackingData.expenses.totalAmount} MKD</p>
        </div>
        <div className="summary-item purchases">
          <h4>Total Purchases</h4>
          <p>{trackingData.purchases.totalAmount} MKD</p>
        </div>
        <div className="summary-item rent">
          <h4>Total Rent</h4>
          <p>{trackingData.rent.totalAmount} MKD</p>
        </div>
        <div className="summary-item employees">
          <h4>Employee Payments</h4>
          <p>{trackingData.employeePayments.netPayments} MKD</p>
        </div>
        <div className="summary-item profit">
          <h4>Net Profit</h4>
          <p>{trackingData.summary.netProfit} MKD</p>
          <small>Margin: {trackingData.summary.profitMargin}%</small>
        </div>
      </div>
    </div>
  );
};
```

## Testing

Use the provided test script to verify the functionality:

```powershell
.\test-monthly-tracking.ps1
```

This script will test all the new endpoints and display the results.

## Key Benefits

1. **Flexible Date Ranges**: Track any period from days to years
2. **Comprehensive Data**: All financial aspects in one report
3. **Detailed Breakdowns**: Group data by categories for better analysis
4. **Performance Optimized**: Optional details and breakdowns for faster loading
5. **Easy Integration**: Simple REST API endpoints for frontend integration

## Usage Examples

### Example 1: June 2025 Tracking
```
GET /api/reports/monthly-tracking/2025/6
```
Returns complete financial data for June 2025.

### Example 2: Custom Period (June 1-15, 2025)
```
GET /api/reports/monthly-tracking?startDate=2025-06-01&endDate=2025-06-15
```
Returns financial data for the first half of June 2025.

### Example 3: Summary Only (Faster Loading)
```
GET /api/reports/monthly-tracking?startDate=2025-06-01&endDate=2025-06-30&includeDetails=false&includeBreakdowns=false
```
Returns only summary data without detailed items for faster loading.

## Notes

- All endpoints require admin authentication
- Dates should be in ISO format (YYYY-MM-DD)
- Currency is set to MKD (Macedonian Denar)
- Employee salary calculations are based on daily wage system
- All amounts are returned as decimal values 
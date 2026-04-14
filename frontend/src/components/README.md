# Frontend Components

## Example Components

### EmployeeTableExample.jsx

This is a **reference implementation** for the employee management interface. It demonstrates:

- How to display employee data in a table format using Ant Design
- CRUD operations (Create, Read, Update, Delete) for employees
- Connection to backend API endpoints (`/api/employees`)
- Form handling for employee creation and editing
- Data sorting and filtering capabilities

**Features:**

- Employee listing with pagination
- Add new employees
- Edit existing employees
- Delete employees
- Sort by various fields (name, date, salary, etc.)
- Filter by position (Warehouse/Field)

**API Endpoints Used:**

- `GET /api/employees` - Fetch all employees
- `POST /api/employees` - Create new employee
- `PUT /api/employees/{id}` - Update employee
- `DELETE /api/employees/{id}` - Delete employee

### DebtTableExample.jsx

This is a **reference implementation** for the debt management interface. It demonstrates:

- How to display debt data in a table format
- CRUD operations for debts
- Connection to backend API endpoints (`/api/debts`)
- Debt status management (paid/unpaid)

**Features:**

- Debt listing with pagination
- Add new debts
- Edit existing debts
- Mark debts as paid/unpaid
- Delete debts
- Filter by debt type and status

## Usage

These example components can be used as:

1. **Reference code** for implementing similar functionality
2. **Templates** for creating new components
3. **Testing tools** for API endpoints
4. **Documentation** of how to interact with the backend

## Dependencies

Both components use:

- **Ant Design** for UI components
- **dayjs** for date formatting
- **React hooks** for state management

## Notes

- These are example implementations and may need to be adapted for production use
- The API base URL is set to `https://localhost:7001` - adjust as needed
- Authentication headers may need to be added for production use
- Error handling can be enhanced based on specific requirements

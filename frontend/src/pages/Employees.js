import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Space,
  Typography,
  Card,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Checkbox,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";
import { useDataChange } from "../contexts/DataChangeContext";

const { Title, Text } = Typography;
const { Option } = Select;

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form] = Form.useForm();
  const { notifyDataChanged } = useDataChange();
  
  // Simple attendance states
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedEmployeeForAttendance, setSelectedEmployeeForAttendance] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [calendarDays, setCalendarDays] = useState([]); // New state for calendar days
  const [localChanges, setLocalChanges] = useState({}); // Track local changes

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES);
      setEmployees(response.data);
    } catch (error) {
      message.error("Dështoi të merren punëtorët");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    form.resetFields();
    form.setFieldsValue({
      daysWorkedThisMonth: 0,
      monthlyBonuses: 0,
      monthlyPenalties: 0,
      dailyWage: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingEmployee(record);
    const positionForForm =
      record.position === 0 ||
      record.position === "Magazine" ||
      record.position === "magazine"
        ? "magazine"
        : "terren";

    form.setFieldsValue({
      ...record,
      position: positionForForm,
      hireDate: dayjs(record.hireDate),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(API_ENDPOINTS.EMPLOYEE_BY_ID(id));
      message.success("Punëtori u fshi me sukses");
      fetchEmployees();
      notifyDataChanged();
    } catch (error) {
      message.error("Dështoi të fshihet punëtori");
    }
  };

  // Reset attendance form when modal opens/closes
  useEffect(() => {
    if (attendanceModalVisible && selectedEmployeeForAttendance) {
      // Only refresh data if there are no local changes to preserve
      if (Object.keys(localChanges).length === 0) {
        console.log('Modal opened, refreshing attendance data...');
        fetchMonthlyAttendance(selectedEmployeeForAttendance.id, selectedMonth.year(), selectedMonth.month() + 1);
      } else {
        console.log('Modal opened with local changes, preserving existing data...');
        // Use existing data with local changes applied
        const days = generateCalendarDays(selectedMonth, attendanceRecords);
        setCalendarDays(days);
      }
    }
  }, [attendanceModalVisible, selectedEmployeeForAttendance]);

  // Refresh attendance data when month changes
  useEffect(() => {
    if (attendanceModalVisible && selectedEmployeeForAttendance) {
      console.log('Month changed, refreshing attendance data...');
      fetchMonthlyAttendance(selectedEmployeeForAttendance.id, selectedMonth.year(), selectedMonth.month() + 1);
    }
  }, [selectedMonth, attendanceModalVisible, selectedEmployeeForAttendance]);

  // Update calendar days when attendance records change
  useEffect(() => {
    if (attendanceModalVisible && selectedEmployeeForAttendance && attendanceRecords.length >= 0) {
      console.log('Attendance records changed, updating calendar days...');
      const days = generateCalendarDays(selectedMonth, attendanceRecords);
      setCalendarDays(days);
    }
  }, [attendanceRecords, selectedMonth, attendanceModalVisible, selectedEmployeeForAttendance]);

  // Simple attendance functions
  const handleAttendanceClick = async (employee) => {
    console.log('Opening attendance modal for employee:', employee);
    console.log('Existing local changes:', localChanges);
    
    setSelectedEmployeeForAttendance(employee);
    setSelectedMonth(dayjs());
    setAttendanceModalVisible(true);
    
    // Wait a bit for modal to open, then fetch data
    setTimeout(async () => {
      try {
        console.log('Fetching attendance data for month:', dayjs().format('MMMM YYYY'));
        const response = await apiClient.get(
          API_ENDPOINTS.ATTENDANCE_EMPLOYEE_MONTH(employee.id, dayjs().year(), dayjs().month() + 1)
        );
        
        const fetchedRecords = response.data.dailyRecords || [];
        console.log('Fetched attendance records:', fetchedRecords);
        
        // Apply local changes to fetched records
        const recordsWithLocalChanges = fetchedRecords.map(record => {
          const dateString = dayjs(record.date).format('YYYY-MM-DD');
          if (localChanges[dateString] !== undefined) {
            console.log(`Applying local change for ${dateString}: ${localChanges[dateString]}`);
            return { ...record, isPresent: localChanges[dateString] };
          }
          return record;
        });
        
        // Also add any local changes that don't exist in fetched records
        const allRecords = [...recordsWithLocalChanges];
        Object.keys(localChanges).forEach(dateString => {
          const exists = allRecords.some(r => dayjs(r.date).format('YYYY-MM-DD') === dateString);
          if (!exists) {
            console.log(`Adding missing local change for ${dateString}: ${localChanges[dateString]}`);
            allRecords.push({
              id: Date.now() + Math.random(), // Temporary ID
              employeeId: employee.id,
              date: dateString,
              isPresent: localChanges[dateString],
              notes: "Regjistruar nga kalendari"
            });
          }
        });
        
        setAttendanceRecords(allRecords);
        
        // Generate calendar days with local changes applied
        const days = generateCalendarDays(dayjs(), allRecords);
        setCalendarDays(days);
        
        console.log('Calendar days generated with local changes:', days);
        console.log('Local changes preserved:', localChanges);
        console.log('Final records with local changes:', allRecords);
        
      } catch (error) {
        console.error('Error fetching initial attendance data:', error);
        message.error('Gabim në marrjen e të dhënave të pranisë');
        setAttendanceRecords([]);
        setCalendarDays([]);
      }
    }, 100);
  };

  const fetchMonthlyAttendance = async (employeeId, year, month) => {
    setAttendanceLoading(true);
    try {
      console.log(`Fetching attendance for employee ${employeeId}, year: ${year}, month: ${month}`);
      
      const response = await apiClient.get(
        API_ENDPOINTS.ATTENDANCE_EMPLOYEE_MONTH(employeeId, year, month)
      );
      
      const fetchedRecords = response.data.dailyRecords || [];
      console.log('Fetched attendance records from API:', fetchedRecords);
      
      // Apply local changes to fetched records
      const recordsWithLocalChanges = fetchedRecords.map(record => {
        const dateString = dayjs(record.date).format('YYYY-MM-DD');
        if (localChanges[dateString] !== undefined) {
          console.log(`Applying local change for ${dateString}: ${localChanges[dateString]}`);
          return { ...record, isPresent: localChanges[dateString] };
        }
        return record;
      });
      
      setAttendanceRecords(recordsWithLocalChanges);
      
      // Generate and set calendar days immediately after setting records
      const days = generateCalendarDays(selectedMonth, recordsWithLocalChanges);
      setCalendarDays(days);
      
      console.log('Attendance records state updated with local changes:', recordsWithLocalChanges);
      console.log('Calendar days state updated:', days);
      
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setAttendanceRecords([]);
      setCalendarDays([]);
      message.error('Gabim në marrjen e të dhënave të pranisë');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleMonthChange = (date) => {
    setSelectedMonth(date);
    if (selectedEmployeeForAttendance) {
      console.log('Month changed to:', date.format('MMMM YYYY'));
      fetchMonthlyAttendance(selectedEmployeeForAttendance.id, date.year(), date.month() + 1);
    }
  };

  // Function to clear local changes
  const clearLocalChanges = () => {
    console.log('Clearing local changes...');
    setLocalChanges({});
  };

  // Function to save attendance data when modal is closed
  const handleAttendanceModalClose = async () => {
    try {
      // Ensure all attendance data is saved before closing
      if (selectedEmployeeForAttendance && attendanceRecords.length > 0) {
        console.log('Saving attendance data before closing modal...');
        
        // Calculate and update employee record with latest attendance data
        const daysWorkedThisMonth = calendarDays.filter(d => d.isPresent).length;
        const salaryInfo = calculateMonthlySalary(selectedEmployeeForAttendance, daysWorkedThisMonth);
        
        // Update employee record
        await apiClient.put(API_ENDPOINTS.EMPLOYEE_BY_ID(selectedEmployeeForAttendance.id), {
          fullName: selectedEmployeeForAttendance.fullName,
          position: selectedEmployeeForAttendance.position,
          hireDate: selectedEmployeeForAttendance.hireDate,
          dailyWage: selectedEmployeeForAttendance.dailyWage,
          monthlyBonuses: selectedEmployeeForAttendance.monthlyBonuses || 0,
          monthlyPenalties: selectedEmployeeForAttendance.monthlyPenalties || 0,
          daysWorkedThisMonth: daysWorkedThisMonth,
          monthlySalary: salaryInfo.totalSalary
        });
        
        // Refresh employee data
        await fetchEmployees();
        notifyDataChanged();
        
        console.log('Attendance data saved successfully before closing modal');
        console.log('Local changes preserved for next session:', localChanges);
        
        // DO NOT clear local changes - keep them for persistence
        // clearLocalChanges(); // REMOVED THIS LINE
      }
    } catch (error) {
      console.error('Error saving attendance data before closing modal:', error);
      // Don't clear local changes if save failed
    } finally {
      // Close the modal but keep local changes in memory
      setAttendanceModalVisible(false);
      setSelectedEmployeeForAttendance(null);
      setAttendanceRecords([]);
      setCalendarDays([]);
      // Note: localChanges state is NOT cleared here
    }
  };

  // Function to calculate monthly salary based on attendance
  const calculateMonthlySalary = (employee, daysWorked) => {
    const dailyWage = employee.dailyWage || getDefaultDailyWage(employee.position);
    const baseSalary = daysWorked * dailyWage;
    const monthlyBonuses = employee.monthlyBonuses || 0;
    const monthlyPenalties = employee.monthlyPenalties || 0;
    const totalSalary = baseSalary + monthlyBonuses - monthlyPenalties;
    
    return {
      daysWorked,
      dailyWage,
      baseSalary,
      monthlyBonuses,
      monthlyPenalties,
      totalSalary
    };
  };

  // Simple function to toggle attendance for a day
  const toggleAttendance = async (date, isPresent) => {
    const dateString = date.format('YYYY-MM-DD');
    console.log(`Toggling attendance for ${dateString} to ${isPresent}`);
    
    // Track local change
    setLocalChanges(prev => ({
      ...prev,
      [dateString]: isPresent
    }));
    
    // Find existing record
    const existingRecord = attendanceRecords.find(r => 
      dayjs(r.date).format('YYYY-MM-DD') === dateString
    );

    // Create updated records array
    let updatedRecords;
    if (existingRecord) {
      // Update existing record
      updatedRecords = attendanceRecords.map(r => 
        r.id === existingRecord.id 
          ? { ...r, isPresent: isPresent }
          : r
      );
    } else {
      // Add new record
      const newRecord = {
        id: Date.now(), // Temporary ID
        employeeId: selectedEmployeeForAttendance.id,
        date: dateString,
        isPresent: isPresent,
        notes: "Regjistruar nga kalendari"
      };
      updatedRecords = [...attendanceRecords, newRecord];
    }

    // Update both states immediately for instant UI feedback
    setAttendanceRecords(updatedRecords);
    const updatedCalendarDays = generateCalendarDays(selectedMonth, updatedRecords);
    setCalendarDays(updatedCalendarDays);

    console.log('States updated immediately:', { updatedRecords, updatedCalendarDays });
    console.log('Local changes tracked:', { ...localChanges, [dateString]: isPresent });

    // Now update backend in background
    try {
      if (existingRecord) {
        // Update existing record
        await apiClient.put(API_ENDPOINTS.ATTENDANCE_BY_ID(existingRecord.id), {
          isPresent: isPresent,
          notes: "Ndryshuar nga kalendari"
        });
        console.log('Existing record updated in backend');
      } else {
        // Create new record
        const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE, {
          employeeId: selectedEmployeeForAttendance.id,
          date: dateString,
          isPresent: isPresent,
          notes: "Regjistruar nga kalendari"
        });
        
        // Update the temporary ID with the real one from backend
        const finalRecords = updatedRecords.map(r => 
          r.id === Date.now() 
            ? { ...r, id: response.data.id }
            : r
        );
        
        setAttendanceRecords(finalRecords);
        const finalCalendarDays = generateCalendarDays(selectedMonth, finalRecords);
        setCalendarDays(finalCalendarDays);
        
        console.log('New record created in backend with ID:', response.data.id);
      }

      // Show success message
      message.success(`Prania për ${dateString} u ${isPresent ? 'shtua' : 'ndryshua'}`);
      
      // Notify that data has changed
      notifyDataChanged();
      
    } catch (error) {
      console.error("Error updating attendance in backend:", error);
      message.error("Gabim në përditësimin e pranisë në backend, por ndryshimi u ruajt lokal");
      
      // Don't revert the UI state - keep the user's change
      // The data will be corrected on next modal open
    }
  };

  // Function to generate calendar days independently
  const generateCalendarDays = (month, records) => {
    const days = [];
    const startOfMonth = month.startOf('month');
    const endOfMonth = month.endOf('month');
    
    let currentDate = startOfMonth;
    
    while (currentDate.isBefore(endOfMonth) || currentDate.isSame(endOfMonth, 'day')) {
      const dateString = currentDate.format('YYYY-MM-DD');
      const attendanceRecord = records.find(r => 
        dayjs(r.date).format('YYYY-MM-DD') === dateString
      );
      
      // Check if there's a local change for this date
      const hasLocalChange = localChanges[dateString] !== undefined;
      const isPresent = hasLocalChange ? localChanges[dateString] : (attendanceRecord?.isPresent || false);
      
      days.push({
        date: currentDate,
        dayNumber: currentDate.date(),
        dayName: currentDate.format('ddd'),
        isPresent: isPresent,
        attendanceId: attendanceRecord?.id,
        hasLocalChange: hasLocalChange
      });
      
      currentDate = currentDate.add(1, 'day');
    }
    
    console.log('Generated calendar days for month:', month.format('MMMM YYYY'));
    console.log('Records used:', records);
    console.log('Local changes applied:', localChanges);
    console.log('Days generated:', days);
    console.log('Days with attendance:', days.filter(d => d.isPresent));
    console.log('Days with local changes:', days.filter(d => d.hasLocalChange));
    
    return days;
  };

  // Generate simple calendar for the month
  const generateSimpleCalendar = () => {
    // Use the stored calendar days if available
    if (calendarDays.length > 0) {
      console.log('Using stored calendar days:', calendarDays);
      return calendarDays;
    }
    
    // Fallback to generating new ones
    console.log('No stored calendar days, generating new ones...');
    const days = generateCalendarDays(selectedMonth, attendanceRecords);
    setCalendarDays(days);
    return days;
  };

  const handleSubmit = async (values) => {
    try {
      if (editingEmployee) {
        const updateData = {
          fullName: values.fullName,
          position: values.position,
          hireDate: values.hireDate ? values.hireDate.format("YYYY-MM-DD") : null,
          dailyWage: values.dailyWage,
          monthlyBonuses: values.monthlyBonuses || 0,
          monthlyPenalties: values.monthlyPenalties || 0,
        };

        await apiClient.put(API_ENDPOINTS.EMPLOYEE_BY_ID(editingEmployee.id), updateData);
        message.success("Punëtori u përditësua me sukses!");
        setEditingEmployee(null);
        setModalVisible(false);
        form.resetFields();
        fetchEmployees();
        notifyDataChanged();
        return;
      }

      const createData = {
        fullName: values.fullName,
        position: values.position,
        hireDate: values.hireDate ? values.hireDate.format("YYYY-MM-DD") : null,
        dailyWage: values.dailyWage,
        monthlyBonuses: values.monthlyBonuses || 0,
        monthlyPenalties: values.monthlyPenalties || 0,
      };

      const response = await apiClient.post(API_ENDPOINTS.EMPLOYEES, createData);
      message.success("Punëtori u shtua me sukses!");
      setModalVisible(false);
      form.resetFields();
      fetchEmployees();
      notifyDataChanged();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      if (error.response) {
        message.error("Gabim në backend: " + JSON.stringify(error.response.data));
      } else {
        message.error("Gabim në rrjet. Ju lutemi provoni përsëri.");
      }
    }
  };

  // Function to get default daily wage based on position
  const getDefaultDailyWage = (position) => {
    if (position === "magazine" || position === "Magazine" || position === 0) {
      return 1850;
    } else {
      return 2460;
    }
  };

  const formatMoney = (n) =>
    `${(Number(n) || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ден`;

  const positionLabel = (position) => {
    const isMagazine =
      position === "magazine" ||
      position === "Magazine" ||
      position === 0;
    return isMagazine ? "Magazine" : "Terren";
  };

  const openPrintWindow = (html) => {
    const win = window.open("", "", "height=900,width=1100");
    win.document.write(
      `<!DOCTYPE html><html><head><title>Print</title><meta charset="utf-8"/>
      <style>
        body { font-family: system-ui, sans-serif; margin: 24px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 14px; color: #555; margin-top: 0; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; }
        tr:nth-child(even) td { background: #fafafa; }
        @media print { body { margin: 12px; } }
      </style></head><body>${html}</body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const buildEmployeesReportHtml = (list, title) => {
    const rows = list
      .map((emp) => {
        const dailyWage =
          emp.dailyWage || getDefaultDailyWage(emp.position);
        const days = emp.daysWorkedThisMonth ?? 0;
        const baseSalary = days * dailyWage;
        const bonuses = emp.monthlyBonuses ?? 0;
        const penalties = emp.monthlyPenalties ?? 0;
        const monthly =
          emp.monthlySalary ?? baseSalary + bonuses - penalties;
        return `<tr>
          <td>${(emp.fullName || "").replace(/</g, "&lt;")}</td>
          <td>${positionLabel(emp.position)}</td>
          <td>${dayjs(emp.hireDate).format("YYYY-MM-DD")}</td>
          <td>${formatMoney(dailyWage)}</td>
          <td>${days}</td>
          <td>${formatMoney(baseSalary)}</td>
          <td>${formatMoney(bonuses)}</td>
          <td>${formatMoney(penalties)}</td>
          <td><strong>${formatMoney(monthly)}</strong></td>
        </tr>`;
      })
      .join("");

    return `
      <h1>${title.replace(/</g, "&lt;")}</h1>
      <h2>PROLUX Group — ${dayjs().format("YYYY-MM-DD HH:mm")}</h2>
      <table>
        <thead>
          <tr>
            <th>Punëtori</th>
            <th>Pozicioni</th>
            <th>Data punësimi</th>
            <th>Paga ditore</th>
            <th>Ditët e punuara (muaji)</th>
            <th>Paga bazë</th>
            <th>Bonuset</th>
            <th>Gjobat</th>
            <th>Paga mujore</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:16px;font-size:11px;color:#666;">Paga bazë = ditët e punuara × paga ditore. Paga mujore sipas të dhënave në sistem (përfshin bonuset dhe gjobat).</p>
    `;
  };

  const printEmployeeReport = (emp) => {
    const html = buildEmployeesReportHtml(
      [emp],
      `Raport punëtori: ${emp.fullName || ""}`
    );
    openPrintWindow(html);
  };

  const printAllEmployeesReport = () => {
    if (!employees.length) {
      message.warning("Nuk ka punëtorë për printim.");
      return;
    }
    const html = buildEmployeesReportHtml(
      employees,
      "Raporti i të gjithë punëtorëve"
    );
    openPrintWindow(html);
  };

  const columns = [
    {
      title: "Emri",
      dataIndex: "fullName",
      key: "fullName",
      sorter: (a, b) => a.fullName.localeCompare(b.fullName),
    },
    {
      title: "Pozicioni",
      dataIndex: "position",
      key: "position",
      render: (position) => {
        const isMagazine = position === "magazine" || position === "Magazine" || position === 0;
        return (
          <Tag color={isMagazine ? "blue" : "green"}>
            {isMagazine ? "Magazine" : "Terren"}
          </Tag>
        );
      },
      filters: [
        { text: "Magazine", value: "magazine" },
        { text: "Terren", value: "terren" },
      ],
      onFilter: (value, record) => {
        const recordPosition = record.position;
        if (value === "magazine") {
          return (
            recordPosition === "magazine" ||
            recordPosition === "Magazine" ||
            recordPosition === 0
          );
        } else {
          return (
            recordPosition === "terren" ||
            recordPosition === "Terren" ||
            recordPosition === 1
          );
        }
      },
    },
    {
      title: "Paga Ditore",
      dataIndex: "dailyWage",
      key: "dailyWage",
      render: (dailyWage, record) => {
        const wage = dailyWage || getDefaultDailyWage(record.position);
        return `${(wage || 0).toFixed(2)} ден`;
      },
      sorter: (a, b) => {
        const wageA = a.dailyWage || getDefaultDailyWage(a.position) || 0;
        const wageB = b.dailyWage || getDefaultDailyWage(b.position) || 0;
        return wageA - wageB;
      },
    },
    {
      title: "Data e Punësimit",
      dataIndex: "hireDate",
      key: "hireDate",
      render: (date) => dayjs(date).format("YYYY-MM-DD"),
      sorter: (a, b) => dayjs(a.hireDate).unix() - dayjs(b.hireDate).unix(),
    },
    {
      title: "Ditët e Punuara",
      dataIndex: "daysWorkedThisMonth",
      key: "daysWorkedThisMonth",
      render: (days, record) => {
        const daysWorked = days || 0;
        const dailyWage = record.dailyWage || getDefaultDailyWage(record.position) || 0;
        const baseSalary = daysWorked * dailyWage;
        
        return (
          <div>
            <div className="font-medium">{daysWorked} ditë</div>
            <div className="text-xs text-gray-500">
              {baseSalary.toFixed(2)} ден
            </div>
          </div>
        );
      },
      sorter: (a, b) => (a.daysWorkedThisMonth || 0) - (b.daysWorkedThisMonth || 0),
    },
    {
      title: "Bonuset Mujore",
      dataIndex: "monthlyBonuses",
      key: "monthlyBonuses",
      render: (bonuses) => `${(bonuses || 0).toFixed(2)} ден`,
    },
    {
      title: "Gjobat Mujore",
      dataIndex: "monthlyPenalties",
      key: "monthlyPenalties",
      render: (penalties) => `${(penalties || 0).toFixed(2)} ден`,
    },
    {
      title: "Paga Mujore",
      dataIndex: "monthlySalary",
      key: "monthlySalary",
      render: (salary) => `${(salary || 0).toFixed(2)} ден`,
      sorter: (a, b) => (a.monthlySalary || 0) - (b.monthlySalary || 0),
    },
    {
      title: "Prania",
      key: "attendance",
      render: (_, record) => (
        <Button
          icon={<CalendarOutlined />}
          size="small"
          type="primary"
          onClick={() => handleAttendanceClick(record)}
        >
          Prania
        </Button>
      ),
    },
    {
      title: "Veprime",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          <Button
            icon={<PrinterOutlined />}
            size="small"
            onClick={() => printEmployeeReport(record)}
          >
            Printo
          </Button>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            Redakto
          </Button>

          <Popconfirm
            title="A jeni të sigurt që dëshironi ta fshini këtë punëtor?"
            onConfirm={() => handleDelete(record.id)}
            okText="Po"
            cancelText="Jo"
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              Fshi
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>Menaxhimi i Punëtorëve</Title>
        <Space wrap>
          <Button
            icon={<PrinterOutlined />}
            onClick={printAllEmployeesReport}
            disabled={!employees.length}
          >
            Printo të gjithë
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Shto Punëtor
          </Button>
        </Space>
      </div>

      {/* Salary Calculation Rules */}
      <Card className="bg-white border-0 shadow-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center">
            <h4 className="font-semibold text-blue-800 mb-2">
              Punëtorët e Terrenit
            </h4>
            <div className="space-y-1 text-sm">
              <div>
                • Paga Ditore Default:{" "}
                <span className="font-medium">2460 ден/ditë</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <h4 className="font-semibold text-blue-800 mb-2">
              Punëtorët e Magazinës
            </h4>
            <div className="space-y-1 text-sm">
              <div>
                • Paga Ditore Default:{" "}
                <span className="font-medium">1850 ден/ditë</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mt-4">
          <h4 className="font-semibold text-blue-800 mb-2">
            Formula e Llogaritjes
          </h4>
          <div className="text-sm">
            <span className="font-medium">
              (Paga Ditore × Ditët e Punuara) + Bonuset - Gjobat
            </span>
          </div>
        </div>
      </Card>

      <Card className="bg-white border-0 shadow-lg">
        <Table
          columns={columns}
          dataSource={employees}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} nga ${total} punëtorë`,
          }}
        />
      </Card>

      {/* Employee Modal */}
      <Modal
        title={editingEmployee ? "Redakto Punëtor" : "Shto Punëtor"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="fullName"
            label="Emri i Plotë"
            rules={[{ required: true, message: "Ju lutemi shkruani emrin e plotë" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="position"
            label="Pozicioni"
            rules={[{ required: true, message: "Ju lutemi zgjidhni pozicionin" }]}
          >
            <Select
              onChange={(value) => {
                const defaultWage = getDefaultDailyWage(value);
                form.setFieldsValue({ dailyWage: defaultWage });
              }}
            >
              <Option value="magazine">Magazine</Option>
              <Option value="terren">Terren</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="hireDate"
            label="Data e Punësimit"
            rules={[{ required: true, message: "Ju lutemi zgjidhni datën e punësimit" }]}
          >
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="dailyWage"
            label="Paga Ditore"
            rules={[
              { required: true, message: "Ju lutemi shkruani pagën ditore" },
              { type: "number", min: 0, message: "Paga ditore duhet të jetë më e madhe se 0" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              formatter={(value) => `${value} ден`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(value) => value.replace(/ден\s?|,*/g, "")}
              min={0}
              placeholder="Shkruani pagën ditore të personalizuar"
            />
          </Form.Item>

          <Form.Item
            name="monthlyBonuses"
            label="Bonuset Mujore"
            initialValue={0}
          >
            <InputNumber
              style={{ width: "100%" }}
              formatter={(value) => `${value} ден`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(value) => value.replace(/ден\s?|,*/g, "")}
              min={0}
            />
          </Form.Item>

          <Form.Item
            name="monthlyPenalties"
            label="Gjobat Mujore"
            initialValue={0}
          >
            <InputNumber
              style={{ width: "100%" }}
              formatter={(value) => `${value} ден`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(value) => value.replace(/ден\s?|,*/g, "")}
              min={0}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingEmployee ? "Përditëso" : "Shto"}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Anulo
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Simple Attendance Modal */}
      <Modal
        title="Prania e Punëtorit"
        open={attendanceModalVisible}
        onCancel={handleAttendanceModalClose}
        footer={null}
        width={800}
      >
        {selectedEmployeeForAttendance && (
          <div>
            <div className="mb-4">
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Form.Item label="Muaji">
                    <DatePicker
                      picker="month"
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      style={{ width: "100%" }}
                      format="MMMM YYYY"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <div className="text-center">
                    <Text strong>
                      Punëtori: {selectedEmployeeForAttendance.fullName}
                    </Text>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center">
                    <Text strong>
                      Ditët e Punuara: {calendarDays.filter(d => d.isPresent).length}
                    </Text>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Simple Calendar */}
            <Card title={`Kalendari i Pranisë për ${selectedMonth.format('MMMM YYYY')}`}>
              <div className="mb-4">
                <Text>Klikoni në checkbox për të shënuar praninë:</Text>
              </div>
              
              {/* Loading indicator */}
              {attendanceLoading && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Text className="text-sm text-blue-700">
                    🔄 Duke ngarkuar të dhënat e pranisë...
                  </Text>
                </div>
              )}
              
              {/* Test button */}
              {/* <div className="mb-4">
                <Button 
                  size="small" 
                  onClick={() => {
                    console.log('Current attendance records:', attendanceRecords);
                    console.log('Selected month:', selectedMonth.format('YYYY-MM'));
                    console.log('Selected employee:', selectedEmployeeForAttendance);
                  }}
                >
                  Debug Attendance Data
                </Button>
                
                <Button 
                  size="small" 
                  type="primary"
                  className="ml-2"
                  onClick={() => {
                    if (selectedEmployeeForAttendance) {
                      fetchMonthlyAttendance(selectedEmployeeForAttendance.id, selectedMonth.year(), selectedMonth.month() + 1);
                    }
                  }}
                >
                  Refresh Data
                </Button>
                
                <Button 
                  size="small" 
                  type="default"
                  className="ml-2"
                  onClick={() => {
                    if (selectedEmployeeForAttendance) {
                      // Force refresh attendance data
                      fetchMonthlyAttendance(selectedEmployeeForAttendance.id, selectedMonth.year(), selectedMonth.month() + 1);
                      message.success("Të dhënat e pranisë u rifreskuan");
                    }
                  }}
                >
                  Force Refresh Attendance
                </Button>
                
                <Button 
                  size="small" 
                  type="default"
                  className="ml-2"
                  onClick={() => {
                    console.log('=== DEBUG INFO ===');
                    console.log('Selected Employee:', selectedEmployeeForAttendance);
                    console.log('Selected Month:', selectedMonth.format('MMMM YYYY'));
                    console.log('Attendance Records:', attendanceRecords);
                    console.log('Calendar Days:', calendarDays);
                    console.log('Generated Calendar:', generateSimpleCalendar());
                    console.log('==================');
                    message.info('Debug info logged to console');
                  }}
                >
                  Debug Info
                </Button>
                
                <Button 
                  size="small" 
                  type="default"
                  className="ml-2"
                  onClick={() => {
                    if (selectedEmployeeForAttendance) {
                      console.log('Manual refresh triggered...');
                      fetchMonthlyAttendance(selectedEmployeeForAttendance.id, selectedMonth.year(), selectedMonth.month() + 1);
                      message.info('Manual refresh triggered');
                    }
                  }}
                >
                  Manual Refresh
                </Button>
                
                <Button 
                  size="small" 
                  type="default"
                  className="ml-2"
                  onClick={() => {
                    console.log('=== CHECKBOX STATUS ===');
                    console.log('Calendar Days:', calendarDays);
                    console.log('Checked Days:', calendarDays.filter(d => d.isPresent));
                    console.log('Attendance Records:', attendanceRecords);
                    console.log('=====================');
                    message.info(`Checkbox status: ${calendarDays.filter(d => d.isPresent).length}/${calendarDays.length} checked`);
                  }}
                >
                  Checkbox Status
                </Button>
                
                <Button 
                  size="small" 
                  type="default"
                  className="ml-2"
                  onClick={() => {
                    console.log('=== LOCAL CHANGES ===');
                    console.log('Local Changes:', localChanges);
                    console.log('Number of local changes:', Object.keys(localChanges).length);
                    console.log('=====================');
                    message.info(`Local changes: ${Object.keys(localChanges).length} changes tracked`);
                  }}
                >
                  Local Changes
                </Button>
                
                <Button 
                  size="small" 
                  type="default"
                  className="ml-2"
                  onClick={() => {
                    clearLocalChanges();
                    message.success('Local changes cleared');
                  }}
                >
                  Clear Changes
                </Button>
                
                <Button 
                  size="small" 
                  type="default"
                  className="ml-2"
                  onClick={() => {
                    console.log('=== TESTING LOCAL CHANGES ===');
                    console.log('Current local changes:', localChanges);
                    console.log('Current calendar days:', calendarDays);
                    console.log('Checked days:', calendarDays.filter(d => d.isPresent));
                    console.log('Days with local changes:', calendarDays.filter(d => d.hasLocalChange));
                    
                    // Test: simulate reopening the modal
                    if (selectedEmployeeForAttendance) {
                      message.info('Testing local changes persistence...');
                      setTimeout(() => {
                        handleAttendanceClick(selectedEmployeeForAttendance);
                      }, 1000);
                    }
                  }}
                >
                  Test Persistence
                </Button>
              </div> */}
              
              {/* Auto-save notification */}
              {/* <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                <Text className="text-xs text-green-700">
                  ✅ <strong>Auto-save aktiv:</strong> Të dhënat e pranisë ruhen automatikisht çdo herë që ndryshon një checkbox. Nuk ke nevojë të klikosh "Save" për çdo ndryshim!
                </Text>
              </div> */}
              
              {/* Checkbox status */}
              {/* <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Text className="text-xs text-blue-700">
                  🔄 <strong>Status i Checkbox-ëve:</strong> {calendarDays.filter(d => d.isPresent).length} checkbox-e të shënuar nga {calendarDays.length} ditë totale
                </Text>
              </div> */}
              
              {/* Local changes status */}
              {/* {Object.keys(localChanges).length > 0 && (
                <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Text className="text-xs text-yellow-700">
                    💾 <strong>Local Changes Saved:</strong> {Object.keys(localChanges).length} checkbox selections will persist when you close and reopen this window
                  </Text>
                </div>
              )} */}
              
              {/* Persistence status */}
              {/* <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                <Text className="text-xs text-green-700">
                  ✅ <strong>Persistence Active:</strong> Your checkbox selections are automatically saved and will remain checked when you reopen this window
                </Text>
              </div> */}
              
              {/* Attendance data status */}
              {/* <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                <Text className="text-xs text-gray-700">
                  📊 <strong>Status i të dhënave:</strong> {attendanceLoading ? 'Duke ngarkuar...' : `${attendanceRecords.length} regjistrime të pranisë u ngarkuan për muajin ${selectedMonth.format('MMMM YYYY')}`}
                </Text>
                {attendanceRecords.length > 0 && (
                  <div className="mt-1 text-xs text-green-600">
                    ✅ {attendanceRecords.filter(r => r.isPresent).length} ditë të punuara, {attendanceRecords.filter(r => !r.isPresent).length} ditë të munguara
                  </div>
                )}
                <div className="mt-1 text-xs text-blue-600">
                  🗓️ Kalendari: {calendarDays.length} ditë të gjeneruara
                </div>
              </div> */}
              
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'].map(day => (
                  <div key={day} className="text-center font-semibold p-2 bg-gray-100 rounded">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {generateSimpleCalendar().map((day, index) => (
                  <div key={`${day.date.format('YYYY-MM-DD')}-${day.isPresent}`} className="text-center p-2 border rounded">
                    <div className="text-sm mb-1">{day.dayNumber}</div>
                    <Checkbox
                      checked={day.isPresent}
                      onChange={(e) => {
                        console.log(`Checkbox changed for day ${day.dayNumber}:`, e.target.checked);
                        console.log('Day object:', day);
                        toggleAttendance(day.date, e.target.checked);
                      }}
                      className={day.hasLocalChange ? 'border-yellow-400' : ''}
                    />
                    {day.hasLocalChange && (
                      <div className="text-xs text-yellow-600 mt-1">●</div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Save Button */}
              <div className="mt-4 text-center">
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Text className="text-sm text-yellow-800">
                    💡 <strong>Udhëzues:</strong> Të dhënat e pranisë ruhen automatikisht çdo herë që ndryshon një checkbox. Pasi të shënosh praninë, kliko butonin "Llogarit Rrogën" për të përditësuar tabelën kryesore me ditët e punuara dhe rrogën e llogaritur. Të dhënat do të mbeten të ruajtura edhe pas mbylljes së tabelës.
                  </Text>
                </div>
                
                <Button 
                  type="primary" 
                  size="large"
                  onClick={async () => {
                    try {
                      message.loading('Duke llogaritur rrogën dhe duke përditësuar tabelën kryesore...', 0);
                      
                      // Calculate days worked for this month using calendar days with local changes
                      const daysWorkedThisMonth = calendarDays.filter(d => d.isPresent).length;
                      
                      // Calculate monthly salary
                      const salaryInfo = calculateMonthlySalary(selectedEmployeeForAttendance, daysWorkedThisMonth);
                      
                      // Update the employee's record with calculated salary data
                      await apiClient.put(API_ENDPOINTS.EMPLOYEE_BY_ID(selectedEmployeeForAttendance.id), {
                        fullName: selectedEmployeeForAttendance.fullName,
                        position: selectedEmployeeForAttendance.position,
                        hireDate: selectedEmployeeForAttendance.hireDate,
                        dailyWage: selectedEmployeeForAttendance.dailyWage,
                        monthlyBonuses: selectedEmployeeForAttendance.monthlyBonuses || 0,
                        monthlyPenalties: selectedEmployeeForAttendance.monthlyPenalties || 0,
                        daysWorkedThisMonth: daysWorkedThisMonth,
                        monthlySalary: salaryInfo.totalSalary
                      });
                      
                      // Refresh employee data to update the main table
                      await fetchEmployees();
                      
                      // Notify that data has changed
                      notifyDataChanged();
                      
                      message.destroy();
                      message.success(`Rroga u llogarit! ${daysWorkedThisMonth} ditë të punuara për muajin ${selectedMonth.format('MMMM YYYY')}. Rroga mujore: ${salaryInfo.totalSalary.toFixed(2)} ден`);
                      
                    } catch (error) {
                      message.destroy();
                      console.error('Error calculating salary and updating table:', error);
                      message.error('Gabim në llogaritjen e rrogës dhe përditësimin e tabelës');
                    }
                  }}
                >
                  💰 Llogarit Rrogën dhe Përditëso Tabelën
                </Button>
              </div>
            </Card>

            {/* Attendance Summary */}
            <Card title="Përmbledhje e Pranisë" className="mt-4">
              <Row gutter={16}>
                <Col span={8}>
                  <div className="text-center">
                    <Text strong>Ditët e Punuara</Text>
                    <div className="text-2xl text-green-600">
                      {calendarDays.filter(d => d.isPresent).length}
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center">
                    <Text strong>Ditët e Munguara</Text>
                    <div className="text-2xl text-red-600">
                      {calendarDays.filter(d => !d.isPresent).length}
                    </div>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-center">
                    <Text strong>Total Ditë</Text>
                    <div className="text-2xl text-blue-600">
                      {calendarDays.length}
                    </div>
                  </div>
                </Col>
              </Row>
              
              {/* Salary Preview */}
              {selectedEmployeeForAttendance && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <Text strong className="block mb-2 text-center">Parapamje e Rrogës për Muajin:</Text>
                  {(() => {
                    const daysWorked = calendarDays.filter(d => d.isPresent).length;
                    const salaryInfo = calculateMonthlySalary(selectedEmployeeForAttendance, daysWorked);
                    
                    return (
                      <>
                        <Row gutter={16}>
                          <Col span={6}>
                            <div className="text-center">
                              <Text>Ditët e Punuara</Text>
                              <div className="text-lg font-semibold text-green-600">
                                {salaryInfo.daysWorked}
                              </div>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <Text>Paga Ditore</Text>
                              <div className="text-lg font-semibold text-blue-600">
                                {salaryInfo.dailyWage.toFixed(2)} ден
                              </div>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <Text>Paga Bazë</Text>
                              <div className="text-lg font-semibold text-purple-600">
                                {salaryInfo.baseSalary.toFixed(2)} ден
                              </div>
                            </div>
                          </Col>
                          <Col span={6}>
                            <div className="text-center">
                              <Text strong>Total Rroga</Text>
                              <div className="text-xl font-bold text-green-700">
                                {salaryInfo.totalSalary.toFixed(2)} ден
                              </div>
                            </div>
                          </Col>
                        </Row>
                        <Row gutter={16} className="mt-2">
                          <Col span={12}>
                            <div className="text-center">
                              <Text>Bonuset: +{salaryInfo.monthlyBonuses.toFixed(2)} ден</Text>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div className="text-center">
                              <Text>Gjobat: -{salaryInfo.monthlyPenalties.toFixed(2)} ден</Text>
                            </div>
                          </Col>
                        </Row>
                      </>
                    );
                  })()}
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Employees;

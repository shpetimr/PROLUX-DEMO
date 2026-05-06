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
const STANDARD_WORKING_DAYS_PER_MONTH = 22;

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form] = Form.useForm();
  const { notifyDataChanged } = useDataChange();
  const [selectedSalaryMonth, setSelectedSalaryMonth] = useState(dayjs());
  const [salaryCalculations, setSalaryCalculations] = useState({});
  const [salaryLoading, setSalaryLoading] = useState(false);
  
  // Simple attendance states
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedEmployeeForAttendance, setSelectedEmployeeForAttendance] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [calendarDays, setCalendarDays] = useState([]); // New state for calendar days
  const [localChanges, setLocalChanges] = useState({}); // Track local changes

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

  const fetchSalaryCalculations = async (month = selectedSalaryMonth) => {
    setSalaryLoading(true);
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.SALARY_MONTH(month.year(), month.month() + 1)
      );
      const salaryByEmployeeId = (response.data || []).reduce((acc, item) => {
        acc[item.employeeId] = item;
        return acc;
      }, {});
      setSalaryCalculations(salaryByEmployeeId);
    } catch (error) {
      console.error("Error fetching salary calculations:", error);
      setSalaryCalculations({});
      message.error("Deshtoi te merren kalkulimet e pagave");
    } finally {
      setSalaryLoading(false);
    }
  };

  const refreshEmployeesAndSalary = async (month = selectedSalaryMonth) => {
    await Promise.all([fetchEmployees(), fetchSalaryCalculations(month)]);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchSalaryCalculations(selectedSalaryMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSalaryMonth]);

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
      await refreshEmployeesAndSalary();
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
        fetchMonthlyAttendance(selectedEmployeeForAttendance.id, selectedMonth.year(), selectedMonth.month() + 1);
      } else {
        // Use existing data with local changes applied
        const days = generateCalendarDays(selectedMonth, attendanceRecords);
        setCalendarDays(days);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceModalVisible, selectedEmployeeForAttendance]);

  // Refresh attendance data when month changes
  useEffect(() => {
    if (attendanceModalVisible && selectedEmployeeForAttendance) {
      fetchMonthlyAttendance(selectedEmployeeForAttendance.id, selectedMonth.year(), selectedMonth.month() + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, attendanceModalVisible, selectedEmployeeForAttendance]);

  // Update calendar days when attendance records change
  useEffect(() => {
    if (attendanceModalVisible && selectedEmployeeForAttendance && attendanceRecords.length >= 0) {
      const days = generateCalendarDays(selectedMonth, attendanceRecords);
      setCalendarDays(days);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceRecords, selectedMonth, attendanceModalVisible, selectedEmployeeForAttendance]);

  // Simple attendance functions
  const handleAttendanceClick = async (employee) => {
    const attendanceMonth = selectedSalaryMonth || dayjs();
    
    setSelectedEmployeeForAttendance(employee);
    setSelectedMonth(attendanceMonth);
    setAttendanceModalVisible(true);
    
    // Wait a bit for modal to open, then fetch data
    setTimeout(async () => {
      try {
        const response = await apiClient.get(
          API_ENDPOINTS.ATTENDANCE_EMPLOYEE_MONTH(employee.id, attendanceMonth.year(), attendanceMonth.month() + 1)
        );
        
        const fetchedRecords = response.data.dailyRecords || [];
        
        // Apply local changes to fetched records
        const recordsWithLocalChanges = fetchedRecords.map(record => {
          const dateString = dayjs(record.date).format('YYYY-MM-DD');
          if (localChanges[dateString] !== undefined) {
            return { ...record, isPresent: localChanges[dateString] };
          }
          return record;
        });
        
        // Also add any local changes that don't exist in fetched records
        const allRecords = [...recordsWithLocalChanges];
        Object.keys(localChanges).forEach(dateString => {
          const exists = allRecords.some(r => dayjs(r.date).format('YYYY-MM-DD') === dateString);
          if (!exists) {
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
        const days = generateCalendarDays(attendanceMonth, allRecords);
        setCalendarDays(days);
        
        
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
      
      const response = await apiClient.get(
        API_ENDPOINTS.ATTENDANCE_EMPLOYEE_MONTH(employeeId, year, month)
      );
      
      const fetchedRecords = response.data.dailyRecords || [];
      
      // Apply local changes to fetched records
      const recordsWithLocalChanges = fetchedRecords.map(record => {
        const dateString = dayjs(record.date).format('YYYY-MM-DD');
        if (localChanges[dateString] !== undefined) {
          return { ...record, isPresent: localChanges[dateString] };
        }
        return record;
      });
      
      setAttendanceRecords(recordsWithLocalChanges);
      
      // Generate and set calendar days immediately after setting records
      const days = generateCalendarDays(selectedMonth, recordsWithLocalChanges);
      setCalendarDays(days);
      
      
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
    const nextMonth = date || dayjs();
    setSelectedMonth(nextMonth);
    setSelectedSalaryMonth(nextMonth);
    if (selectedEmployeeForAttendance) {
      fetchMonthlyAttendance(selectedEmployeeForAttendance.id, nextMonth.year(), nextMonth.month() + 1);
    }
  };

  // Function to save attendance data when modal is closed
  const handleAttendanceModalClose = async () => {
    try {
      // Ensure all attendance data is saved before closing
      if (selectedEmployeeForAttendance && attendanceRecords.length > 0) {
        
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
        
        // Refresh employee and salary data
        await refreshEmployeesAndSalary(selectedMonth);
        notifyDataChanged();
        
        
        // Keep local changes for the next attendance session.
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


    // Now update backend in background
    try {
      if (existingRecord) {
        // Update existing record
        await apiClient.put(API_ENDPOINTS.ATTENDANCE_BY_ID(existingRecord.id), {
          isPresent: isPresent,
          notes: "Ndryshuar nga kalendari"
        });
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
    
    
    return days;
  };

  // Generate simple calendar for the month
  const generateSimpleCalendar = () => {
    // Use the stored calendar days if available
    if (calendarDays.length > 0) {
      return calendarDays;
    }
    
    // Fallback to generating new ones
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
        await refreshEmployeesAndSalary();
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

      await apiClient.post(API_ENDPOINTS.EMPLOYEES, createData);
      message.success("Punëtori u shtua me sukses!");
      setModalVisible(false);
      form.resetFields();
      await refreshEmployeesAndSalary();
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

  const getSalarySnapshot = (employee) => {
    const salaryCalculation = salaryCalculations[employee.id] || {};
    const dailyWage = employee.dailyWage || getDefaultDailyWage(employee.position) || 0;
    const fallbackMonthlySalary =
      Number(employee.baseSalary) > 0
        ? Number(employee.baseSalary)
        : dailyWage * STANDARD_WORKING_DAYS_PER_MONTH;
    const monthlySalary = Number(
      salaryCalculation.monthlySalary ?? fallbackMonthlySalary
    );
    const dailyDeduction = Number(
      salaryCalculation.dailyDeduction ??
        monthlySalary / STANDARD_WORKING_DAYS_PER_MONTH
    );
    const absentDays = Number(
      salaryCalculation.absentDays ?? employee.absentDaysThisMonth ?? 0
    );
    const finalSalary = Number(
      salaryCalculation.finalSalary ?? monthlySalary - absentDays * dailyDeduction
    );

    return {
      monthlySalary,
      dailyDeduction,
      absentDays,
      finalSalary,
    };
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
        const salary = getSalarySnapshot(emp);
        return `<tr>
          <td>${(emp.fullName || "").replace(/</g, "&lt;")}</td>
          <td>${positionLabel(emp.position)}</td>
          <td>${dayjs(emp.hireDate).format("YYYY-MM-DD")}</td>
          <td>${formatMoney(dailyWage)}</td>
          <td>${days}</td>
          <td>${formatMoney(baseSalary)}</td>
          <td>${formatMoney(bonuses)}</td>
          <td>${formatMoney(penalties)}</td>
          <td>${formatMoney(salary.monthlySalary)}</td>
          <td>${formatMoney(salary.dailyDeduction)}</td>
          <td>${salary.absentDays}</td>
          <td><strong>${formatMoney(salary.finalSalary)}</strong></td>
        </tr>`;
      })
      .join("");

    return `
      <h1>${title.replace(/</g, "&lt;")}</h1>
      <h2>PROLUX Group - ${dayjs().format("YYYY-MM-DD HH:mm")} | Muaji: ${selectedSalaryMonth.format("MMMM YYYY")}</h2>
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
            <th>Zbritja ditore</th>
            <th>Ditet e munguara</th>
            <th>Paga finale</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:16px;font-size:11px;color:#666;">Paga finale = paga mujore - ditet e munguara * zbritja ditore.</p>
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
      render: (_, record) => formatMoney(getSalarySnapshot(record).monthlySalary),
      sorter: (a, b) =>
        getSalarySnapshot(a).monthlySalary - getSalarySnapshot(b).monthlySalary,
    },
    {
      title: "Zbritja Ditore",
      key: "dailyDeduction",
      render: (_, record) => formatMoney(getSalarySnapshot(record).dailyDeduction),
      sorter: (a, b) =>
        getSalarySnapshot(a).dailyDeduction - getSalarySnapshot(b).dailyDeduction,
    },
    {
      title: "Ditet e Munguara",
      key: "absentDays",
      render: (_, record) => `${getSalarySnapshot(record).absentDays} dite`,
      sorter: (a, b) =>
        getSalarySnapshot(a).absentDays - getSalarySnapshot(b).absentDays,
    },
    {
      title: "Paga Finale",
      key: "finalSalary",
      render: (_, record) => (
        <Text strong>{formatMoney(getSalarySnapshot(record).finalSalary)}</Text>
      ),
      sorter: (a, b) =>
        getSalarySnapshot(a).finalSalary - getSalarySnapshot(b).finalSalary,
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
          <DatePicker
            picker="month"
            value={selectedSalaryMonth}
            onChange={(date) => setSelectedSalaryMonth(date || dayjs())}
            allowClear={false}
            format="MMMM YYYY"
          />
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
          loading={loading || salaryLoading}
          scroll={{ x: "max-content" }}
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
                      allowClear={false}
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
                      await refreshEmployeesAndSalary(selectedMonth);
                      
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

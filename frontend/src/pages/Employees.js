import React, { useState, useEffect, useRef } from "react";
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
const STANDARD_WORKING_DAYS_PER_MONTH = 26;

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
  const [localChanges, setLocalChanges] = useState({}); // Track local changes by employee/month
  const activeAttendanceContextRef = useRef(null);

  const getAttendanceContextKey = (employeeId, month) => {
    if (!employeeId || !month) {
      return "";
    }

    return `${employeeId}-${month.format("YYYY-MM")}`;
  };

  const getAttendanceLocalChanges = (contextKey) => localChanges[contextKey] || {};

  const clearAttendanceLocalChange = (contextKey, dateString) => {
    setLocalChanges((prev) => {
      const contextChanges = prev[contextKey];
      if (!contextChanges || !Object.prototype.hasOwnProperty.call(contextChanges, dateString)) {
        return prev;
      }

      const { [dateString]: _removed, ...remainingChanges } = contextChanges;
      if (Object.keys(remainingChanges).length === 0) {
        const { [contextKey]: _removedContext, ...remainingContexts } = prev;
        return remainingContexts;
      }

      return {
        ...prev,
        [contextKey]: remainingChanges,
      };
    });
  };

  const createTemporaryAttendanceId = (employeeId, dateString) =>
    `temp-${employeeId}-${dateString}-${Date.now()}`;

  const isTemporaryAttendanceId = (id) =>
    typeof id === "string" && id.startsWith("temp-");

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
      baseSalary: 0,
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

  useEffect(() => {
    if (attendanceModalVisible && selectedEmployeeForAttendance) {
      const contextKey = getAttendanceContextKey(selectedEmployeeForAttendance.id, selectedMonth);
      activeAttendanceContextRef.current = contextKey;
      setAttendanceRecords([]);
      setCalendarDays([]);
      fetchMonthlyAttendance(
        selectedEmployeeForAttendance.id,
        selectedMonth.year(),
        selectedMonth.month() + 1,
        selectedMonth
      );
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
    const contextKey = getAttendanceContextKey(employee.id, attendanceMonth);

    activeAttendanceContextRef.current = contextKey;
    setSelectedEmployeeForAttendance(employee);
    setSelectedMonth(attendanceMonth);
    setAttendanceRecords([]);
    setCalendarDays([]);
    setAttendanceModalVisible(true);
  };

  const fetchMonthlyAttendance = async (employeeId, year, month, attendanceMonth = selectedMonth) => {
    const contextKey = getAttendanceContextKey(employeeId, attendanceMonth);
    const contextChanges = getAttendanceLocalChanges(contextKey);
    setAttendanceLoading(true);
    try {
      
      const response = await apiClient.get(
        API_ENDPOINTS.ATTENDANCE_EMPLOYEE_MONTH(employeeId, year, month)
      );

      if (activeAttendanceContextRef.current !== contextKey) {
        return;
      }
      
      const fetchedRecords = response.data.dailyRecords || [];
      
      // Apply local changes to fetched records
      const recordsWithLocalChanges = fetchedRecords.map(record => {
        const dateString = dayjs(record.date).format('YYYY-MM-DD');
        if (Object.prototype.hasOwnProperty.call(contextChanges, dateString)) {
          return { ...record, isPresent: contextChanges[dateString] };
        }
        return record;
      });
      
      setAttendanceRecords(recordsWithLocalChanges);
      
      // Generate and set calendar days immediately after setting records
      const days = generateCalendarDays(attendanceMonth, recordsWithLocalChanges, contextChanges);
      setCalendarDays(days);
      
      
    } catch (error) {
      if (activeAttendanceContextRef.current !== contextKey) {
        return;
      }

      console.error("Error fetching attendance:", error);
      setAttendanceRecords([]);
      setCalendarDays([]);
      message.error('Gabim në marrjen e të dhënave të pranisë');
    } finally {
      if (activeAttendanceContextRef.current === contextKey) {
        setAttendanceLoading(false);
      }
    }
  };

  const handleMonthChange = (date) => {
    const nextMonth = date || dayjs();
    setSelectedMonth(nextMonth);
    setSelectedSalaryMonth(nextMonth);
    if (selectedEmployeeForAttendance) {
      activeAttendanceContextRef.current = getAttendanceContextKey(selectedEmployeeForAttendance.id, nextMonth);
    }
  };

  // Function to save attendance data when modal is closed
  const handleAttendanceModalClose = async () => {
    try {
      // Ensure all attendance data is saved before closing
      if (selectedEmployeeForAttendance && attendanceRecords.length > 0) {
        
        // Calculate and update employee record with latest attendance data
        const daysWorkedThisMonth = calendarDays.filter(d => d.isPresent).length;
        const absentDaysThisMonth = calendarDays.filter(d => !d.isPresent).length;
        const salaryInfo = calculateMonthlySalary(
          selectedEmployeeForAttendance,
          daysWorkedThisMonth,
          absentDaysThisMonth
        );
        
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
        
      }
    } catch (error) {
      console.error('Error saving attendance data before closing modal:', error);
      // Don't clear local changes if save failed
    } finally {
      activeAttendanceContextRef.current = null;
      setAttendanceModalVisible(false);
      setSelectedEmployeeForAttendance(null);
      setAttendanceRecords([]);
      setCalendarDays([]);
    }
  };

  // Function to calculate monthly salary based on attendance
  const calculateMonthlySalary = (employee, daysWorked, absentDaysOverride) => {
    const dailyWage = employee.dailyWage || getDefaultDailyWage(employee.position);
    const monthlySalary =
      Number(employee.baseSalary) > 0
        ? Number(employee.baseSalary)
        : dailyWage * STANDARD_WORKING_DAYS_PER_MONTH;
    const absentDays =
      absentDaysOverride ?? Math.max(0, STANDARD_WORKING_DAYS_PER_MONTH - daysWorked);
    const attendanceDeduction = absentDays * dailyWage;
    const monthlyBonuses = employee.monthlyBonuses || 0;
    const monthlyPenalties = employee.monthlyPenalties || 0;
    const totalSalary = monthlySalary - attendanceDeduction + monthlyBonuses - monthlyPenalties;
    
    return {
      daysWorked,
      absentDays,
      dailyWage,
      baseSalary: monthlySalary,
      monthlySalary,
      attendanceDeduction,
      monthlyBonuses,
      monthlyPenalties,
      totalSalary
    };
  };

  // Simple function to toggle attendance for a day
  const toggleAttendance = async (date, isPresent) => {
    if (!selectedEmployeeForAttendance) {
      return;
    }

    const dateString = date.format('YYYY-MM-DD');
    const employeeId = selectedEmployeeForAttendance.id;
    const contextKey = getAttendanceContextKey(employeeId, selectedMonth);
    const previousContextChanges = getAttendanceLocalChanges(contextKey);
    const nextContextChanges = {
      ...previousContextChanges,
      [dateString]: isPresent,
    };
    
    // Track local change
    setLocalChanges(prev => ({
      ...prev,
      [contextKey]: {
        ...(prev[contextKey] || {}),
        [dateString]: isPresent
      }
    }));
    
    // Find existing record
    const existingRecord = attendanceRecords.find(r => 
      dayjs(r.date).format('YYYY-MM-DD') === dateString
    );

    // Create updated records array
    let updatedRecords;
    let temporaryId = existingRecord?.id;
    if (existingRecord) {
      // Update existing record
      updatedRecords = attendanceRecords.map(r => 
        r.id === existingRecord.id 
          ? { ...r, isPresent: isPresent }
          : r
      );
    } else {
      // Add new record
      temporaryId = createTemporaryAttendanceId(employeeId, dateString);
      const newRecord = {
        id: temporaryId,
        employeeId,
        date: dateString,
        isPresent: isPresent,
        notes: "Regjistruar nga kalendari"
      };
      updatedRecords = [...attendanceRecords, newRecord];
    }

    // Update both states immediately for instant UI feedback
    setAttendanceRecords(updatedRecords);
    const updatedCalendarDays = generateCalendarDays(selectedMonth, updatedRecords, nextContextChanges);
    setCalendarDays(updatedCalendarDays);


    // Now update backend in background
    try {
      let finalRecords = updatedRecords;

      if (existingRecord && !isTemporaryAttendanceId(existingRecord.id)) {
        // Update existing record
        const response = await apiClient.put(API_ENDPOINTS.ATTENDANCE_BY_ID(existingRecord.id), {
          isPresent: isPresent,
          notes: "Ndryshuar nga kalendari"
        });

        const savedRecord = response.data || {};
        finalRecords = updatedRecords.map(r =>
          r.id === existingRecord.id
            ? { ...r, ...savedRecord, isPresent: savedRecord.isPresent ?? isPresent }
            : r
        );
      } else {
        // Create new record
        const response = await apiClient.post(API_ENDPOINTS.ATTENDANCE, {
          employeeId,
          date: dateString,
          isPresent: isPresent,
          notes: "Regjistruar nga kalendari"
        });
        
        // Update the temporary ID with the real one from backend
        const savedRecord = response.data || {};
        finalRecords = updatedRecords.map(r =>
          r.id === temporaryId
            ? { ...r, ...savedRecord, id: savedRecord.id ?? r.id, isPresent: savedRecord.isPresent ?? isPresent }
            : r
        );
      }

      clearAttendanceLocalChange(contextKey, dateString);

      if (activeAttendanceContextRef.current === contextKey) {
        setAttendanceRecords(finalRecords);
        const finalContextChanges = { ...nextContextChanges };
        delete finalContextChanges[dateString];
        const finalCalendarDays = generateCalendarDays(selectedMonth, finalRecords, finalContextChanges);
        setCalendarDays(finalCalendarDays);
      }

      message.success(
        `${dateString} u shënua si ${isPresent ? "ditë pune" : "ditë mungese"}`
      );
      
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
  const generateCalendarDays = (month, records, contextChanges) => {
    const changesForMonth =
      contextChanges ||
      getAttendanceLocalChanges(
        getAttendanceContextKey(selectedEmployeeForAttendance?.id, month)
      );
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
      const hasLocalChange = Object.prototype.hasOwnProperty.call(changesForMonth, dateString);
      const isPresent = hasLocalChange ? changesForMonth[dateString] : (attendanceRecord?.isPresent ?? true);
      
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
          baseSalary: values.baseSalary,
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
        baseSalary: values.baseSalary,
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

  const getLinkedWorkerAccountLabel = (employee) => {
    const username = employee?.linkedUsername?.trim();

    if (username) {
      return `@${username}`;
    }

    if (employee?.linkedUserId) {
      return `User #${employee.linkedUserId}`;
    }

    return null;
  };

  const renderLinkedWorkerAccount = (employee) => {
    const accountLabel = getLinkedWorkerAccountLabel(employee);

    if (!accountLabel) {
      return (
        <Text type="secondary" className="text-xs">
          No linked Worker/User account
        </Text>
      );
    }

    return (
      <Space size={4} wrap>
        <Tag color="green" className="m-0">
          Worker/User
        </Tag>
        <Text code>{accountLabel}</Text>
      </Space>
    );
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
      salaryCalculation.dailyDeduction ?? dailyWage
    );
    const absentDays = Number(
      salaryCalculation.absentDays ?? employee.absentDaysThisMonth ?? 0
    );
    const bonuses = Number(
      salaryCalculation.bonuses ??
        (Number(employee.monthlyBonuses) || 0) +
          (Number(employee.calculatedDailyBonuses) || 0)
    );
    const penalties = Number(
      salaryCalculation.penalties ??
        (Number(employee.monthlyPenalties) || 0) +
          (Number(employee.calculatedDailyPenalties) || 0)
    );
    const finalSalary = Number(
      salaryCalculation.finalSalary ??
        monthlySalary - absentDays * dailyDeduction + bonuses - penalties
    );

    return {
      monthlySalary,
      dailySalary: dailyDeduction,
      dailyDeduction,
      absentDays,
      bonuses,
      penalties,
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
        const salary = getSalarySnapshot(emp);
        const days = Math.max(0, STANDARD_WORKING_DAYS_PER_MONTH - salary.absentDays);
        const dailySalary = salary.dailySalary;
        const monthlySalary = salary.monthlySalary;
        const bonuses = salary.bonuses;
        const penalties = salary.penalties;
        return `<tr>
          <td>${(emp.fullName || "").replace(/</g, "&lt;")}</td>
          <td>${positionLabel(emp.position)}</td>
          <td>${dayjs(emp.hireDate).format("YYYY-MM-DD")}</td>
          <td>${formatMoney(dailySalary)}</td>
          <td>${days}</td>
          <td>${salary.absentDays}</td>
          <td>${formatMoney(monthlySalary)}</td>
          <td>${formatMoney(bonuses)}</td>
          <td>${formatMoney(penalties)}</td>
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
            <th>Ditet e munguara</th>
            <th>Paga mujore</th>
            <th>Bonuset</th>
            <th>Gjobat</th>
            <th>Paga finale</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:16px;font-size:11px;color:#666;">Paga finale = paga mujore - ditet e munguara * paga ditore + bonuset - gjobat.</p>
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
      render: (fullName, record) => (
        <div>
          <Text strong>{fullName}</Text>
          <div className="mt-1">{renderLinkedWorkerAccount(record)}</div>
        </div>
      ),
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
      render: (_, record) => formatMoney(getSalarySnapshot(record).dailySalary),
      sorter: (a, b) => {
        return getSalarySnapshot(a).dailySalary - getSalarySnapshot(b).dailySalary;
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
      render: (_, record) => {
        const salary = getSalarySnapshot(record);
        const daysWorked = Math.max(
          0,
          STANDARD_WORKING_DAYS_PER_MONTH - salary.absentDays
        );
        
        return (
          <div>
            <div className="font-medium">{daysWorked} ditë</div>
            <div className="text-xs text-gray-500">
              {STANDARD_WORKING_DAYS_PER_MONTH} - {salary.absentDays} mungesa
            </div>
          </div>
        );
      },
      sorter: (a, b) =>
        (STANDARD_WORKING_DAYS_PER_MONTH - getSalarySnapshot(a).absentDays) -
        (STANDARD_WORKING_DAYS_PER_MONTH - getSalarySnapshot(b).absentDays),
    },
    {
      title: "Bonuset",
      key: "bonuses",
      render: (_, record) => formatMoney(getSalarySnapshot(record).bonuses),
      sorter: (a, b) =>
        getSalarySnapshot(a).bonuses - getSalarySnapshot(b).bonuses,
    },
    {
      title: "Gjobat",
      key: "penalties",
      render: (_, record) => formatMoney(getSalarySnapshot(record).penalties),
      sorter: (a, b) =>
        getSalarySnapshot(a).penalties - getSalarySnapshot(b).penalties,
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
              Paga Mujore - (Ditet e Munguara x Paga Ditore) + Bonuset - Gjobat
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

          {editingEmployee && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <Text type="secondary" className="block text-xs mb-1">
                Linked Worker/User account
              </Text>
              {renderLinkedWorkerAccount(editingEmployee)}
            </div>
          )}

          <Form.Item
            name="position"
            label="Pozicioni"
            rules={[{ required: true, message: "Ju lutemi zgjidhni pozicionin" }]}
          >
            <Select
              onChange={(value) => {
                const defaultWage = getDefaultDailyWage(value);
                const currentMonthlySalary = form.getFieldValue("baseSalary");
                form.setFieldsValue({
                  dailyWage: defaultWage,
                  baseSalary: currentMonthlySalary || defaultWage * STANDARD_WORKING_DAYS_PER_MONTH,
                });
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
            name="baseSalary"
            label="Paga Mujore"
            rules={[
              { required: true, message: "Ju lutemi shkruani pagen mujore" },
              { type: "number", min: 0, message: "Paga mujore duhet te jete 0 ose me e madhe" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              formatter={(value) => `${value} Ð´ÐµÐ½`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(value) => value.replace(/Ð´ÐµÐ½\s?|,*/g, "")}
              min={0}
              placeholder="Shkruani pagen mujore"
            />
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
                <Col span={6}>
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
                <Col span={6}>
                  <div className="text-center">
                    <Text strong>
                      Punëtori: {selectedEmployeeForAttendance.fullName}
                    </Text>
                  </div>
                </Col>
                <Col span={6}>
                  <div className="text-center">
                    <Text strong>
                      Ditët e Munguara: {calendarDays.filter(d => !d.isPresent).length}
                    </Text>
                  </div>
                </Col>
                <Col span={6}>
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
                <Text>Zgjidhni checkbox për ditët e munguara:</Text>
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
                      checked={!day.isPresent}
                      onChange={(e) => {
                        toggleAttendance(day.date, !e.target.checked);
                      }}
                      className={day.hasLocalChange ? 'border-yellow-400' : ''}
                    />
                    <div className={day.isPresent ? "text-xs text-gray-500 mt-1" : "text-xs text-red-600 mt-1 font-medium"}>
                      {day.isPresent ? "Prez." : "Mung."}
                    </div>
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
                    <strong>Udhëzues:</strong> Ditët e munguara ruhen automatikisht sa herë që ndryshon një checkbox. Kliko "Llogarit Rrogën" për të rifreskuar tabelën kryesore me totalet e muajit.
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
                      const absentDaysThisMonth = calendarDays.filter(d => !d.isPresent).length;
                      
                      // Calculate monthly salary
                      const salaryInfo = calculateMonthlySalary(
                        selectedEmployeeForAttendance,
                        daysWorkedThisMonth,
                        absentDaysThisMonth
                      );
                      
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
                      message.success(`Rroga u llogarit! ${absentDaysThisMonth} ditë të munguara për muajin ${selectedMonth.format('MMMM YYYY')}. Paga finale: ${salaryInfo.totalSalary.toFixed(2)} ден`);
                      
                    } catch (error) {
                      message.destroy();
                      console.error('Error calculating salary and updating table:', error);
                      message.error('Gabim në llogaritjen e rrogës dhe përditësimin e tabelës');
                    }
                  }}
                >
                  Llogarit Rrogën dhe Përditëso Tabelën
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
                    const absentDays = calendarDays.filter(d => !d.isPresent).length;
                    const salaryInfo = calculateMonthlySalary(
                      selectedEmployeeForAttendance,
                      daysWorked,
                      absentDays
                    );
                    
                    return (
                      <>
                        <Row gutter={[16, 16]}>
                          <Col span={8}>
                            <div className="text-center">
                              <Text>Ditët e Munguara</Text>
                              <div className="text-lg font-semibold text-red-600">
                                {salaryInfo.absentDays}
                              </div>
                            </div>
                          </Col>
                          <Col span={8}>
                            <div className="text-center">
                              <Text>Paga Ditore</Text>
                              <div className="text-lg font-semibold text-blue-600">
                                {formatMoney(salaryInfo.dailyWage)}
                              </div>
                            </div>
                          </Col>
                          <Col span={8}>
                            <div className="text-center">
                              <Text>Paga Mujore</Text>
                              <div className="text-lg font-semibold text-purple-600">
                                {formatMoney(salaryInfo.monthlySalary)}
                              </div>
                            </div>
                          </Col>
                          <Col span={8}>
                            <div className="text-center">
                              <Text>Bonuset</Text>
                              <div className="text-lg font-semibold text-green-600">
                                +{formatMoney(salaryInfo.monthlyBonuses)}
                              </div>
                            </div>
                          </Col>
                          <Col span={8}>
                            <div className="text-center">
                              <Text>Gjobat</Text>
                              <div className="text-lg font-semibold text-red-600">
                                -{formatMoney(salaryInfo.monthlyPenalties)}
                              </div>
                            </div>
                          </Col>
                          <Col span={8}>
                            <div className="text-center">
                              <Text strong>Paga Finale</Text>
                              <div className="text-xl font-bold text-green-700">
                                {formatMoney(salaryInfo.totalSalary)}
                              </div>
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

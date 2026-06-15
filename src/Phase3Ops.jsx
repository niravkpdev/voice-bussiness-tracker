import { useEffect, useMemo, useState } from 'react';
import { normalizeAmount, sanitizeText, validateEmail, validatePhone } from './security.js';
import { readScopedString, writeScopedString } from './storageScope.js';

const ORDER_KEY = 'phase3Orders';
const EMPLOYEE_KEY = 'phase3Employees';
const ATTENDANCE_KEY = 'phase3Attendance';
const LEAVE_BALANCE_KEY = 'phase3LeaveBalances';
const LEAVE_REQUEST_KEY = 'phase3LeaveRequests';
const HOLIDAY_KEY = 'phase3Holidays';
const SUBSCRIPTION_KEY = 'phase3Subscription';
const AUDIT_KEY = 'phase3AuditLogs';
const DEVICE_KEY = 'phase3Devices';
const SECURITY_KEY = 'phase3SecuritySettings';
const PAYMENT_KEY = 'phase3Payments';
const OFFLINE_QUEUE_KEY = 'phase3OfflineQueue';

const ORDER_STAGES = ['New Order', 'Confirmed', 'In Production', 'Quality Check', 'Ready', 'Dispatched', 'Delivered'];
const ROLES = ['Owner', 'Manager', 'Accountant', 'Staff'];
const EMPLOYEE_STATUSES = ['Active', 'Inactive'];
const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Half Day', 'Leave'];
const LEAVE_TYPES = [
  { id: 'SL', label: 'Sick Leave', allocation: 6 },
  { id: 'CL', label: 'Casual Leave', allocation: 6 },
  { id: 'PL', label: 'Paid / Privilege Leave', allocation: 12 },
];
const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected'];
const EMPLOYEE_PROFILE_TABS = [
  'Personal Information',
  'Work Information',
  'Salary Information',
  'Leave Information',
  'Attendance',
  'Documents',
  'Notes / Description',
];

function readArray(key) {
  try {
    const value = JSON.parse(readScopedString(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeArray(key, value) {
  writeScopedString(key, JSON.stringify(value));
}

function readObject(key, fallback) {
  try {
    return { ...fallback, ...JSON.parse(readScopedString(key) || '{}') };
  } catch {
    return fallback;
  }
}

function writeObject(key, value) {
  writeScopedString(key, JSON.stringify(value));
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmployeeCode(items = []) {
  const nextNumber = items.reduce((max, employee) => {
    const match = String(employee.employeeId || employee.employee_id || '').match(/EMP-(\d+)/i);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0) + 1;
  return `EMP-${String(nextNumber).padStart(4, '0')}`;
}

function employeeDisplayName(employee) {
  return employee.fullName || employee.full_name || employee.name || 'Employee';
}

function employeeCode(employee) {
  return employee.employeeId || employee.employee_id || employee.id || '';
}

function employeeMobile(employee) {
  return employee.mobileNumber || employee.mobile_number || employee.mobile || '';
}

function employeeDesignation(employee) {
  return employee.designation || employee.role || '';
}

function employeeIdentifier(employee) {
  return employee.employeeId || employee.employee_id || employee.id || '';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(date = today()) {
  return String(date || today()).slice(0, 7);
}

function leaveDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function encodeUpi({ pa, pn, am, tn }) {
  const params = new URLSearchParams({
    pa: pa || 'business@upi',
    pn: pn || 'Voice Business Tracker',
    am: String(Number(am) || 0),
    cu: 'INR',
    tn: tn || 'Business payment',
  });
  return `upi://pay?${params.toString()}`;
}

function isMissingPaymentRpc(error) {
  return /post_payment_with_ledger|edit_payment_with_ledger_reversal|delete_payment_with_ledger_reversal|function.*not.*found|schema cache|PGRST202|42883/i.test(
    `${error?.code || ''} ${error?.message || ''}`
  );
}

function QrGrid({ value }) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }
  return (
    <div className="qr-code phase3-qr">
      {Array.from({ length: 49 }, (_, index) => (
        <span className={((hash >> (index % 21)) + index) % 3 === 0 ? 'active' : ''} key={index} />
      ))}
    </div>
  );
}

function whatsappUrl(phone, message) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export default function Phase3Ops({
  activeTab,
  profile,
  invoices,
  customers,
  products,
  vouchers,
  partySummary,
  authUser,
  supabaseEnabled,
  cloudOrders,
  cloudEmployees,
  cloudAttendance,
  cloudLeaveBalances,
  cloudLeaveRequests,
  cloudHolidays,
  cloudPayments,
  cloudAuditLogs,
  cloudSubscription,
  cloudSecurity,
  cloudDevices,
  cloudOfflineQueue,
  onResendVerification,
  onStatus,
  onCloudRecord,
  onCloudDelete,
  onCloudSnapshot,
  onAtomicPaymentWithLedger,
  onAtomicPaymentEdit,
  onAtomicPaymentDelete,
}) {
  const [orders, setOrders] = useState(() => readArray(ORDER_KEY));
  const [employees, setEmployees] = useState(() => readArray(EMPLOYEE_KEY));
  const [attendance, setAttendance] = useState(() => readArray(ATTENDANCE_KEY));
  const [leaveBalances, setLeaveBalances] = useState(() => readArray(LEAVE_BALANCE_KEY));
  const [leaveRequests, setLeaveRequests] = useState(() => readArray(LEAVE_REQUEST_KEY));
  const [holidays, setHolidays] = useState(() => readArray(HOLIDAY_KEY));
  const [auditLogs, setAuditLogs] = useState(() => readArray(AUDIT_KEY));
  const [payments, setPayments] = useState(() => readArray(PAYMENT_KEY));
  const [offlineQueue, setOfflineQueue] = useState(() => readArray(OFFLINE_QUEUE_KEY));
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeProfileTab, setEmployeeProfileTab] = useState(EMPLOYEE_PROFILE_TABS[0]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState('All');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('All');
  const [employeePage, setEmployeePage] = useState(1);
  const [attendanceEmployeeFilter, setAttendanceEmployeeFilter] = useState('All');
  const [attendanceMonthFilter, setAttendanceMonthFilter] = useState(monthKey());
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [leaveEmployeeFilter, setLeaveEmployeeFilter] = useState('All');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('All');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All');
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [subscription, setSubscription] = useState(() =>
    readObject(SUBSCRIPTION_KEY, { plan: 'Free', invoicesLimit: 25, usersLimit: 1, aiEnabled: true })
  );
  const [security, setSecurity] = useState(() =>
    readObject(SECURITY_KEY, {
      googleLogin: false,
      jwtSessions: true,
      sessionExpiryMinutes: 30,
      refreshTokens: true,
      twoFactor: false,
      encryptionAtRest: true,
      csrfProtection: true,
      rateLimit: true,
      passwordResetProtection: true,
    })
  );
  const [devices, setDevices] = useState(() =>
    readArray(DEVICE_KEY).length
      ? readArray(DEVICE_KEY)
      : [{ id: createId('dev'), name: 'Current browser', lastLogin: new Date().toLocaleString(), trusted: true }]
  );

  useEffect(() => writeArray(ORDER_KEY, orders), [orders]);
  useEffect(() => writeArray(EMPLOYEE_KEY, employees), [employees]);
  useEffect(() => writeArray(ATTENDANCE_KEY, attendance), [attendance]);
  useEffect(() => writeArray(LEAVE_BALANCE_KEY, leaveBalances), [leaveBalances]);
  useEffect(() => writeArray(LEAVE_REQUEST_KEY, leaveRequests), [leaveRequests]);
  useEffect(() => writeArray(HOLIDAY_KEY, holidays), [holidays]);
  useEffect(() => writeArray(AUDIT_KEY, auditLogs), [auditLogs]);
  useEffect(() => writeArray(PAYMENT_KEY, payments), [payments]);
  useEffect(() => writeArray(OFFLINE_QUEUE_KEY, offlineQueue), [offlineQueue]);
  useEffect(() => writeObject(SUBSCRIPTION_KEY, subscription), [subscription]);
  useEffect(() => writeObject(SECURITY_KEY, security), [security]);
  useEffect(() => writeArray(DEVICE_KEY, devices), [devices]);
  useEffect(() => {
    if (Array.isArray(cloudOrders)) setOrders(cloudOrders);
  }, [cloudOrders]);
  useEffect(() => {
    if (Array.isArray(cloudEmployees)) setEmployees(cloudEmployees);
  }, [cloudEmployees]);
  useEffect(() => {
    if (Array.isArray(cloudAttendance)) setAttendance(cloudAttendance);
  }, [cloudAttendance]);
  useEffect(() => {
    if (Array.isArray(cloudLeaveBalances)) setLeaveBalances(cloudLeaveBalances);
  }, [cloudLeaveBalances]);
  useEffect(() => {
    if (Array.isArray(cloudLeaveRequests)) setLeaveRequests(cloudLeaveRequests);
  }, [cloudLeaveRequests]);
  useEffect(() => {
    if (Array.isArray(cloudHolidays)) setHolidays(cloudHolidays);
  }, [cloudHolidays]);
  useEffect(() => {
    if (Array.isArray(cloudPayments)) setPayments(cloudPayments);
  }, [cloudPayments]);
  useEffect(() => {
    if (Array.isArray(cloudAuditLogs)) setAuditLogs(cloudAuditLogs);
  }, [cloudAuditLogs]);
  useEffect(() => {
    if (cloudSubscription) setSubscription({ plan: 'Free', invoicesLimit: 25, usersLimit: 1, aiEnabled: true, ...cloudSubscription });
  }, [cloudSubscription]);
  useEffect(() => {
    if (cloudSecurity) setSecurity((current) => ({ ...current, ...cloudSecurity }));
  }, [cloudSecurity]);
  useEffect(() => {
    if (Array.isArray(cloudDevices) && cloudDevices.length > 0) setDevices(cloudDevices);
  }, [cloudDevices]);
  useEffect(() => {
    if (Array.isArray(cloudOfflineQueue)) setOfflineQueue(cloudOfflineQueue);
  }, [cloudOfflineQueue]);
  useEffect(() => {
    onCloudSnapshot?.('phase3_ops_updated');
  }, [orders, employees, attendance, leaveBalances, leaveRequests, holidays, auditLogs, payments, offlineQueue, subscription, security, devices]);

  useEffect(() => {
    setEmployeePage(1);
  }, [employeeDepartmentFilter, employeeSearch, employeeStatusFilter]);

  useEffect(() => {
    if (selectedEmployee) {
      setSelectedEmployee(employees.find((employee) => employee.id === selectedEmployee.id) || null);
    }
  }, [employees, selectedEmployee?.id]);

  const unpaidInvoices = useMemo(() => invoices.filter((invoice) => invoice.status !== 'Paid'), [invoices]);
  const payrollTotal = useMemo(() => employees.reduce((sum, employee) => sum + (Number(employee.salary) || 0), 0), [employees]);
  const validEmployeeIds = useMemo(() => new Set(employees.map((employee) => employee.id)), [employees]);
  const employeeDepartments = useMemo(() => {
    const departments = employees.map((employee) => employee.department).filter(Boolean);
    return ['All', ...Array.from(new Set(departments)).sort()];
  }, [employees]);
  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    return employees.filter((employee) => {
      const searchable = [
        employeeDisplayName(employee),
        employeeCode(employee),
        employee.email,
        employeeMobile(employee),
        employee.department,
        employeeDesignation(employee),
        employee.reportingManager || employee.reporting_manager,
      ].join(' ').toLowerCase();
      const matchesQuery = !query || searchable.includes(query);
      const matchesDepartment = employeeDepartmentFilter === 'All' || employee.department === employeeDepartmentFilter;
      const matchesStatus = employeeStatusFilter === 'All' || (employee.status || 'Active') === employeeStatusFilter;
      return matchesQuery && matchesDepartment && matchesStatus;
    });
  }, [employeeDepartmentFilter, employeeSearch, employeeStatusFilter, employees]);
  const employeePageSize = 6;
  const employeePageCount = Math.max(1, Math.ceil(filteredEmployees.length / employeePageSize));
  const paginatedEmployees = filteredEmployees.slice((employeePage - 1) * employeePageSize, employeePage * employeePageSize);
  const validAttendance = useMemo(
    () => attendance.filter((entry) => validEmployeeIds.has(entry.employeeId)),
    [attendance, validEmployeeIds]
  );
  const todayAttendance = useMemo(
    () => validAttendance.filter((entry) => entry.date === today()),
    [validAttendance]
  );
  const filteredAttendance = useMemo(
    () => validAttendance.filter((entry) => {
      const matchesEmployee = attendanceEmployeeFilter === 'All' || entry.employeeId === attendanceEmployeeFilter;
      const matchesMonth = !attendanceMonthFilter || String(entry.attendanceDate || entry.attendance_date || entry.date || '').startsWith(attendanceMonthFilter);
      return matchesEmployee && matchesMonth;
    }),
    [attendanceEmployeeFilter, attendanceMonthFilter, validAttendance]
  );
  const attendanceSummary = useMemo(() => ({
    present: filteredAttendance.filter((entry) => entry.status === 'Present').length,
    absent: filteredAttendance.filter((entry) => entry.status === 'Absent').length,
    late: filteredAttendance.filter((entry) => Boolean(entry.lateMark || entry.late_mark)).length,
  }), [filteredAttendance]);
  const attendanceByEmployeeToday = useMemo(() => {
    const map = new Map();
    todayAttendance.forEach((entry) => {
      map.set(entry.employeeId, entry);
    });
    return map;
  }, [todayAttendance]);
  const attendanceStatusLabel = (status) => {
    if (status === 'Present') return 'P';
    if (status === 'Absent') return 'A';
    if (status === 'Half Day') return 'HD';
    if (status === 'Leave') return 'L';
    return '-';
  };
  const leaveBalancesByEmployee = useMemo(() => {
    const map = new Map();
    leaveBalances.forEach((balance) => {
      const key = `${balance.employeeId || balance.employee_id}-${balance.leaveType || balance.leave_type}`;
      map.set(key, balance);
    });
    return map;
  }, [leaveBalances]);
  const filteredLeaveRequests = useMemo(() => leaveRequests.filter((request) => {
    const matchesEmployee = leaveEmployeeFilter === 'All' || request.employeeId === leaveEmployeeFilter;
    const matchesStatus = leaveStatusFilter === 'All' || request.status === leaveStatusFilter;
    const matchesType = leaveTypeFilter === 'All' || request.leaveType === leaveTypeFilter;
    return matchesEmployee && matchesStatus && matchesType;
  }), [leaveEmployeeFilter, leaveRequests, leaveStatusFilter, leaveTypeFilter]);
  const sortedHolidays = useMemo(
    () => [...holidays].sort((a, b) => String(a.holidayDate || a.holiday_date || '').localeCompare(String(b.holidayDate || b.holiday_date || ''))),
    [holidays]
  );
  const pendingCollections = useMemo(
    () => partySummary.filter((party) => party.group === 'Sundry Debtors' && party.outstandingAmount > 0),
    [partySummary]
  );
  const businessIssues = useMemo(() => [
    ...unpaidInvoices.slice(0, 3).map((invoice) => `Payment pending on ${invoice.invoiceNo || invoice.id}`),
    ...products.filter((product) => Number(product.currentStock) <= Number(product.minStock)).slice(0, 3).map((product) => `${product.name} is low stock`),
    ...pendingCollections.slice(0, 3).map((party) => `${party.name} owes ${formatCurrency(party.outstandingAmount)}`),
  ], [pendingCollections, products, unpaidInvoices]);

  const persistRecord = async (tableName, record, fallbackMessage = 'Cloud save failed') => {
    if (!supabaseEnabled || !authUser?.uid) {
      throw new Error('Sign in with Supabase before saving production data.');
    }
    const saved = await onCloudRecord?.(tableName, record.id, record);
    if (!saved) {
      throw new Error(fallbackMessage);
    }
    return true;
  };

  const logAudit = async (action, area) => {
    const timestamp = new Date().toISOString();
    const log = {
      id: createId('aud'),
      action,
      actionType: action,
      area,
      module: area,
      tableName: area,
      user: authUser?.email || authUser?.uid || 'Owner',
      actorUid: authUser?.uid || '',
      ownerUid: authUser?.uid || '',
      businessId: 'default',
      date: new Date().toLocaleString(),
      createdAt: timestamp,
      updatedAt: timestamp,
      occurredAt: timestamp,
      source: 'frontend_best_effort',
    };
    try {
      await persistRecord('audit_logs', log, 'Audit log save failed');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('AUDIT_LOG_BEST_EFFORT_FAILED', error);
      }
    }
    setAuditLogs([log, ...auditLogs].slice(0, 100));
  };

  const queueOfflineAction = async (type, payload) => {
    const entry = { id: createId('queue'), type, payload, date: new Date().toLocaleString(), synced: navigator.onLine };
    try {
      await persistRecord('offline_queue', entry, 'Offline queue save failed');
      setOfflineQueue([entry, ...offlineQueue]);
      onStatus(navigator.onLine ? 'Action saved to Supabase' : 'Offline marker saved to Supabase');
    } catch (error) {
      onStatus(error?.message || 'Offline queue save failed');
    }
  };

  const saveOrder = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const current = editingOrder;
    const order = {
      ...(current || {}),
      id: current?.id || createId('ord'),
      orderNo: current?.orderNo || `ORD-${String(orders.length + 1).padStart(4, '0')}`,
      customer: sanitizeText(form.get('customer'), 120),
      mobile: sanitizeText(form.get('mobile'), 24),
      details: sanitizeText(form.get('details'), 300),
      amount: normalizeAmount(form.get('amount')),
      status: current?.status || 'New Order',
      deliveryDate: form.get('deliveryDate') || today(),
      timeline: current?.timeline || [{ status: 'New Order', date: new Date().toLocaleString(), note: 'Order created' }],
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!order.customer || !validatePhone(order.mobile)) {
      onStatus('Enter valid customer and mobile for order');
      return;
    }
    try {
      await persistRecord('orders', order, 'Order save failed');
    } catch (error) {
      onStatus(error?.message || 'Order save failed');
      return;
    }
    setOrders((items) => [order, ...items.filter((item) => item.id !== order.id)]);
    await queueOfflineAction(current ? 'order-updated' : 'order-created', order);
    await logAudit(`${current ? 'Updated' : 'Created'} ${order.orderNo}`, 'Orders');
    setEditingOrder(null);
    event.currentTarget.reset();
  };

  const advanceOrder = async (order) => {
    const currentIndex = ORDER_STAGES.indexOf(order.status);
    const nextStatus = ORDER_STAGES[Math.min(currentIndex + 1, ORDER_STAGES.length - 1)];
    const updatedOrder = {
      ...order,
      status: nextStatus,
      timeline: [{ status: nextStatus, date: new Date().toLocaleString(), note: 'Status updated' }, ...(order.timeline || [])],
      updatedAt: new Date().toISOString(),
    };
    try {
      await persistRecord('orders', updatedOrder, 'Order status update failed');
    } catch (error) {
      onStatus(error?.message || 'Order status update failed');
      return;
    }
    setOrders(orders.map((item) => item.id === order.id ? updatedOrder : item));
    await logAudit(`Updated ${order.orderNo} to ${nextStatus}`, 'Orders');
  };

  const saveEmployee = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const current = editingEmployee;
    const employeeId = sanitizeText(form.get('employee_id'), 32) || current?.employeeId || current?.employee_id || createEmployeeCode(employees);
    const fullName = sanitizeText(form.get('full_name'), 140);
    const mobileNumber = sanitizeText(form.get('mobile_number'), 24);
    const email = String(form.get('email') || '').trim().toLowerCase();
    const status = EMPLOYEE_STATUSES.includes(form.get('status')) ? form.get('status') : 'Active';
    const employee = {
      ...(current || {}),
      id: current?.id || createId('emp'),
      employeeId,
      employee_id: employeeId,
      fullName,
      full_name: fullName,
      name: fullName,
      mobileNumber,
      mobile_number: mobileNumber,
      mobile: mobileNumber,
      email,
      address: sanitizeText(form.get('address'), 280),
      department: sanitizeText(form.get('department'), 100),
      designation: sanitizeText(form.get('designation'), 100),
      joiningDate: form.get('joining_date') || '',
      joining_date: form.get('joining_date') || '',
      shiftTiming: sanitizeText(form.get('shift_timing'), 100),
      shift_timing: sanitizeText(form.get('shift_timing'), 100),
      reportingManager: sanitizeText(form.get('reporting_manager'), 120),
      reporting_manager: sanitizeText(form.get('reporting_manager'), 120),
      status,
      role: sanitizeText(form.get('designation'), 100),
      salary: normalizeAmount(form.get('salary')),
      advance: normalizeAmount(form.get('advance')),
      notes: sanitizeText(form.get('notes'), 1200),
      description: sanitizeText(form.get('notes'), 1200),
      businessId: current?.businessId || 'default',
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const duplicateCode = employees.some((item) => item.id !== employee.id && employeeCode(item).toLowerCase() === employeeId.toLowerCase());
    if (!employee.fullName || !validatePhone(employee.mobileNumber)) {
      onStatus('Enter valid employee name and mobile');
      return;
    }
    if (email && !validateEmail(email)) {
      onStatus('Enter a valid employee email');
      return;
    }
    if (duplicateCode) {
      onStatus('Employee ID must be unique');
      return;
    }
    try {
      await persistRecord('employees', employee, 'Employee save failed');
    } catch (error) {
      onStatus(error?.message || 'Employee save failed');
      return;
    }
    setEmployees((items) => [employee, ...items.filter((item) => item.id !== employee.id)]);
    setSelectedEmployee(employee);
    await logAudit(`${current ? 'employee updated' : 'employee created'}: ${employee.fullName}`, 'Employees');
    if (current && current.status !== employee.status) {
      await logAudit(`employee status changed: ${employee.fullName} ${current.status || 'Unknown'} to ${employee.status}`, 'Employees');
    }
    setEditingEmployee(null);
    event.currentTarget.reset();
  };

  const markAttendance = async (employee, status) => {
    const date = today();
    const existing = attendance.find((entry) => entry.employeeId === employee.id && entry.date === date);
    const attendanceEntry = {
      ...(existing || {}),
      id: existing?.id || `att-${employee.id}-${date}`,
      employeeId: employee.id,
      employee_id: employeeIdentifier(employee),
      businessId: existing?.businessId || 'default',
      companyId: existing?.companyId || 'default',
      name: employeeDisplayName(employee),
      status,
      date,
      attendanceDate: date,
      attendance_date: date,
      inTime: existing?.inTime || existing?.in_time || '',
      in_time: existing?.inTime || existing?.in_time || '',
      outTime: existing?.outTime || existing?.out_time || '',
      out_time: existing?.outTime || existing?.out_time || '',
      workingHours: existing?.workingHours || existing?.working_hours || 0,
      working_hours: existing?.workingHours || existing?.working_hours || 0,
      lateMark: Boolean(existing?.lateMark || existing?.late_mark),
      late_mark: Boolean(existing?.lateMark || existing?.late_mark),
      remarks: existing?.remarks || '',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await persistRecord('attendance', attendanceEntry, 'Attendance save failed');
    } catch (error) {
      onStatus(error?.message || 'Attendance save failed');
      return;
    }
    setAttendance((items) => [attendanceEntry, ...items.filter((entry) => entry.id !== attendanceEntry.id)]);
    await logAudit(`Marked ${employeeDisplayName(employee)} ${status}`, 'Attendance');
  };

  const saveAttendanceEntry = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const employeeId = form.get('employeeId');
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) {
      onStatus('Select an employee for attendance');
      return;
    }
    const attendanceDate = form.get('attendanceDate') || today();
    const current = editingAttendance;
    const inTime = sanitizeText(form.get('inTime'), 20);
    const outTime = sanitizeText(form.get('outTime'), 20);
    const workingHours = normalizeAmount(form.get('workingHours'));
    const status = ATTENDANCE_STATUSES.includes(form.get('status')) ? form.get('status') : 'Present';
    const attendanceEntry = {
      ...(current || {}),
      id: current?.id || `att-${employee.id}-${attendanceDate}`,
      employeeId: employee.id,
      employee_id: employeeIdentifier(employee),
      businessId: current?.businessId || 'default',
      companyId: current?.companyId || 'default',
      name: employeeDisplayName(employee),
      date: attendanceDate,
      attendanceDate,
      attendance_date: attendanceDate,
      inTime,
      in_time: inTime,
      outTime,
      out_time: outTime,
      workingHours,
      working_hours: workingHours,
      status,
      lateMark: form.get('lateMark') === 'on',
      late_mark: form.get('lateMark') === 'on',
      remarks: sanitizeText(form.get('remarks'), 300),
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await persistRecord('attendance', attendanceEntry, 'Attendance save failed');
    } catch (error) {
      onStatus(error?.message || 'Attendance save failed');
      return;
    }
    setAttendance((items) => [attendanceEntry, ...items.filter((entry) => entry.id !== attendanceEntry.id)]);
    await logAudit(`${current ? 'attendance edited' : 'attendance created'}: ${employeeDisplayName(employee)} ${attendanceDate}`, 'Attendance');
    setEditingAttendance(null);
    event.currentTarget.reset();
  };

  const ensureLeaveBalance = async (employee, leaveType) => {
    const key = `${employee.id}-${leaveType}`;
    const existing = leaveBalancesByEmployee.get(key);
    if (existing) return existing;
    const typeInfo = LEAVE_TYPES.find((type) => type.id === leaveType) || LEAVE_TYPES[0];
    const balance = {
      id: `leave-bal-${employee.id}-${leaveType}`,
      employeeId: employee.id,
      employee_id: employeeIdentifier(employee),
      employeeName: employeeDisplayName(employee),
      leaveType,
      leave_type: leaveType,
      yearlyAllocation: typeInfo.allocation,
      yearly_allocation: typeInfo.allocation,
      usedLeaves: 0,
      used_leaves: 0,
      remainingLeaves: typeInfo.allocation,
      remaining_leaves: typeInfo.allocation,
      businessId: 'default',
      companyId: 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await persistRecord('leave_balances', balance, 'Leave balance save failed');
    setLeaveBalances((items) => [balance, ...items.filter((item) => item.id !== balance.id)]);
    return balance;
  };

  const saveLeaveRequest = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const employeeId = form.get('employeeId');
    const employee = employees.find((item) => item.id === employeeId);
    const leaveType = form.get('leaveType');
    const startDate = form.get('startDate');
    const endDate = form.get('endDate');
    const totalDays = leaveDays(startDate, endDate);
    if (!employee || !LEAVE_TYPES.some((type) => type.id === leaveType) || totalDays <= 0) {
      onStatus('Select employee, leave type, and valid leave dates');
      return;
    }
    try {
      await ensureLeaveBalance(employee, leaveType);
    } catch (error) {
      onStatus(error?.message || 'Leave balance save failed');
      return;
    }
    const request = {
      id: createId('leave'),
      employeeId: employee.id,
      employee_id: employeeIdentifier(employee),
      employeeName: employeeDisplayName(employee),
      leaveType,
      leave_type: leaveType,
      startDate,
      start_date: startDate,
      endDate,
      end_date: endDate,
      totalDays,
      total_days: totalDays,
      reason: sanitizeText(form.get('reason'), 400),
      status: 'Pending',
      approvedBy: '',
      approved_by: '',
      approvedAt: '',
      approved_at: '',
      rejectionReason: '',
      rejection_reason: '',
      businessId: 'default',
      companyId: 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await persistRecord('leave_requests', request, 'Leave request save failed');
    } catch (error) {
      onStatus(error?.message || 'Leave request save failed');
      return;
    }
    setLeaveRequests((items) => [request, ...items]);
    await logAudit(`leave applied: ${request.employeeName} ${leaveType} ${startDate} to ${endDate}`, 'Leave');
    event.currentTarget.reset();
  };

  const decideLeaveRequest = async (request, decision) => {
    if (!['Approved', 'Rejected'].includes(decision)) return;
    const employee = employees.find((item) => item.id === request.employeeId);
    if (!employee) {
      onStatus('Employee record not found for leave request');
      return;
    }
    const balance = await ensureLeaveBalance(employee, request.leaveType).catch((error) => {
      onStatus(error?.message || 'Leave balance save failed');
      return null;
    });
    if (!balance) return;
    if (decision === 'Approved' && Number(balance.remainingLeaves ?? balance.remaining_leaves) < Number(request.totalDays)) {
      onStatus('Leave balance is not enough for approval');
      return;
    }
    const now = new Date().toISOString();
    const updatedRequest = {
      ...request,
      status: decision,
      approvedBy: decision === 'Approved' ? (authUser?.email || authUser?.uid || 'Owner') : '',
      approved_by: decision === 'Approved' ? (authUser?.email || authUser?.uid || 'Owner') : '',
      approvedAt: decision === 'Approved' ? now : '',
      approved_at: decision === 'Approved' ? now : '',
      rejectionReason: decision === 'Rejected' ? 'Rejected by manager' : '',
      rejection_reason: decision === 'Rejected' ? 'Rejected by manager' : '',
      updatedAt: now,
    };
    let updatedBalance = balance;
    if (decision === 'Approved' && request.status !== 'Approved') {
      const usedLeaves = Number(balance.usedLeaves ?? balance.used_leaves) + Number(request.totalDays);
      const yearlyAllocation = Number(balance.yearlyAllocation ?? balance.yearly_allocation) || 0;
      updatedBalance = {
        ...balance,
        usedLeaves,
        used_leaves: usedLeaves,
        remainingLeaves: Math.max(0, yearlyAllocation - usedLeaves),
        remaining_leaves: Math.max(0, yearlyAllocation - usedLeaves),
        updatedAt: now,
      };
    }
    try {
      await persistRecord('leave_requests', updatedRequest, 'Leave decision save failed');
      if (updatedBalance !== balance) {
        await persistRecord('leave_balances', updatedBalance, 'Leave balance update failed');
      }
    } catch (error) {
      onStatus(error?.message || 'Leave decision save failed');
      return;
    }
    setLeaveRequests((items) => [updatedRequest, ...items.filter((item) => item.id !== request.id)]);
    if (updatedBalance !== balance) {
      setLeaveBalances((items) => [updatedBalance, ...items.filter((item) => item.id !== updatedBalance.id)]);
    }
    await logAudit(`leave ${decision.toLowerCase()}: ${request.employeeName} ${request.leaveType}`, 'Leave');
  };

  const saveHoliday = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const current = editingHoliday;
    const holidayName = sanitizeText(form.get('holidayName'), 140);
    const holidayDate = form.get('holidayDate');
    if (!holidayName || !holidayDate) {
      onStatus('Enter holiday name and date');
      return;
    }
    const holiday = {
      ...(current || {}),
      id: current?.id || createId('hol'),
      holidayName,
      holiday_name: holidayName,
      holidayDate,
      holiday_date: holidayDate,
      description: sanitizeText(form.get('description'), 300),
      businessId: current?.businessId || 'default',
      companyId: current?.companyId || 'default',
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await persistRecord('holidays', holiday, 'Holiday save failed');
    } catch (error) {
      onStatus(error?.message || 'Holiday save failed');
      return;
    }
    setHolidays((items) => [holiday, ...items.filter((item) => item.id !== holiday.id)]);
    await logAudit(`holiday ${current ? 'updated' : 'created'}: ${holiday.holidayName}`, 'Holidays');
    setEditingHoliday(null);
    event.currentTarget.reset();
  };

  const deleteHoliday = async (holiday) => {
    const deleted = await deleteRecord('holidays', holiday.id, holiday.holidayName || holiday.holiday_name || 'holiday', setHolidays, () => {
      if (editingHoliday?.id === holiday.id) setEditingHoliday(null);
    });
    if (deleted) await logAudit(`holiday deleted: ${holiday.holidayName || holiday.holiday_name}`, 'Holidays');
  };

  const recordPayment = async (invoice) => {
    const amount = invoice.balance || invoice.total || 0;
    const customer = (customers || []).find((item) => item.id === invoice.customerId);
    const payment = {
      id: createId('pay'),
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      customerId: invoice.customerId || '',
      customerName: customer?.name || invoice.customerName || '',
      businessId: invoice.businessId || 'default',
      amount,
      date: today(),
      mode: 'UPI',
      status: 'Marked Paid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const ledgerPosting = {
      id: `txn-${payment.id}`,
      type: 'Receipt',
      amount,
      date: payment.date,
      narration: `Payment received for ${invoice.invoiceNo || invoice.id}`,
      source: 'payment_posting',
      paymentId: payment.id,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      customerId: invoice.customerId || '',
      businessId: invoice.businessId || 'default',
      lines: [
        { ledgerId: 'ledger-bank', debit: amount, credit: 0 },
        { ledgerId: invoice.customerLedgerId || invoice.customerId || 'ledger-sales', debit: 0, credit: amount },
      ],
    };
    try {
      if (onAtomicPaymentWithLedger) {
        const result = await onAtomicPaymentWithLedger(payment, ledgerPosting);
        if (!result?.payment) {
          throw new Error('Atomic payment posting did not return the saved payment.');
        }
        setPayments((items) => [result.payment, ...items.filter((item) => item.id !== result.payment.id)]);
        onStatus('Payment and ledger posted atomically in Supabase.');
        return;
      }
      await persistRecord('payments', payment, 'Payment save failed');
    } catch (error) {
      if (isMissingPaymentRpc(error)) {
        onStatus('Payment RPC migration is not installed yet. Saving with legacy payment path for now.');
        try {
          await persistRecord('payments', payment, 'Payment save failed');
        } catch (fallbackError) {
          onStatus(fallbackError?.message || 'Payment save failed');
          return;
        }
      } else {
        onStatus(error?.message || 'Atomic payment posting failed');
        return;
      }
    }

    setPayments([payment, ...payments]);
    try {
      await logAudit(`Marked payment for ${invoice.invoiceNo}`, 'Payments');
    } catch (error) {
      onStatus(error?.message || 'Payment save failed');
      return;
    }
    onStatus('Payment recorded in Supabase. Provider webhook required for automatic bank confirmation.');
  };

  const savePaymentEdit = async (event) => {
    event.preventDefault();
    if (!editingPayment) {
      return;
    }
    const form = new FormData(event.currentTarget);
    const payment = {
      ...editingPayment,
      amount: normalizeAmount(form.get('amount')),
      date: form.get('date') || today(),
      mode: sanitizeText(form.get('mode'), 40) || 'UPI',
      status: sanitizeText(form.get('status'), 80) || 'Marked Paid',
      updatedAt: new Date().toISOString(),
    };
    const ledgerPosting = {
      id: `txn-${payment.id}-edit-${Date.now().toString(36)}`,
      type: 'Receipt',
      amount: payment.amount,
      date: payment.date,
      narration: `Edited payment received for ${payment.invoiceNo || payment.id}`,
      source: 'payment_edit_posting',
      paymentId: payment.id,
      invoiceId: payment.invoiceId || '',
      invoiceNo: payment.invoiceNo || '',
      customerId: payment.customerId || '',
      businessId: payment.businessId || 'default',
      lines: [
        { ledgerId: 'ledger-bank', debit: payment.amount, credit: 0 },
        { ledgerId: payment.customerLedgerId || payment.customerId || 'ledger-sales', debit: 0, credit: payment.amount },
      ],
    };
    try {
      if (onAtomicPaymentEdit) {
        const result = await onAtomicPaymentEdit(payment, ledgerPosting);
        if (!result?.payment) {
          throw new Error('Atomic payment edit did not return the saved payment.');
        }
        setPayments((items) => [result.payment, ...items.filter((item) => item.id !== result.payment.id)]);
        setEditingPayment(null);
        onStatus('Payment edit and ledger reversal posted atomically.');
        return;
      }
      await persistRecord('payments', payment, 'Payment update failed');
    } catch (error) {
      if (isMissingPaymentRpc(error)) {
        onStatus('Payment reversal RPC migration is not installed yet. Saving edit with legacy payment path for now.');
        try {
          await persistRecord('payments', payment, 'Payment update failed');
        } catch (fallbackError) {
          onStatus(fallbackError?.message || 'Payment update failed');
          return;
        }
      } else {
        onStatus(error?.message || 'Atomic payment edit failed');
        return;
      }
    }
    setPayments((items) => [payment, ...items.filter((item) => item.id !== payment.id)]);
    setEditingPayment(null);
    try {
      await logAudit(`Updated payment ${payment.invoiceNo || payment.id}`, 'Payments');
    } catch (error) {
      onStatus(error?.message || 'Payment update failed');
      return;
    }
    onStatus('Payment updated');
  };

  const deleteRecord = async (tableName, id, label, setter, afterDelete) => {
    if (!confirm(`Delete ${label}?`)) {
      return false;
    }
    try {
      const deleted = await onCloudDelete?.(tableName, id);
      if (!deleted) {
        throw new Error(`${label} delete failed`);
      }
      setter((items) => items.filter((item) => item.id !== id));
      afterDelete?.();
      onStatus(`${label} deleted`);
      return true;
    } catch (error) {
      onStatus(error?.message || `${label} delete failed`);
      return false;
    }
  };

  const deleteOrder = async (order) => {
    const deleted = await deleteRecord('orders', order.id, order.orderNo || 'order', setOrders, () => {
      if (editingOrder?.id === order.id) setEditingOrder(null);
    });
    if (deleted) await logAudit(`Deleted ${order.orderNo}`, 'Orders');
  };

  const deleteEmployee = async (employee) => {
    const employeeAttendance = attendance.filter((entry) => entry.employeeId === employee.id);
    const deleted = await deleteRecord('employees', employee.id, employeeDisplayName(employee) || 'employee', setEmployees, () => {
      if (editingEmployee?.id === employee.id) setEditingEmployee(null);
      if (selectedEmployee?.id === employee.id) setSelectedEmployee(null);
      setAttendance((items) => items.filter((entry) => entry.employeeId !== employee.id));
    });
    if (deleted) {
      await Promise.all(employeeAttendance.map((entry) => onCloudDelete?.('attendance', entry.id).catch(() => false)));
      await logAudit(`Deleted employee ${employeeDisplayName(employee)}`, 'Employees');
    }
  };

  const deletePayment = async (payment) => {
    if (!confirm(`Delete ${payment.invoiceNo || 'payment'}?`)) {
      return;
    }
    try {
      if (onAtomicPaymentDelete) {
        const result = await onAtomicPaymentDelete(payment.id);
        if (!result?.payment) {
          throw new Error('Atomic payment delete did not return the cancelled payment.');
        }
        setPayments((items) => items.filter((item) => item.id !== payment.id));
        if (editingPayment?.id === payment.id) setEditingPayment(null);
        onStatus(`${payment.invoiceNo || 'Payment'} deleted with ledger reversal`);
        return;
      }
    } catch (error) {
      if (!isMissingPaymentRpc(error)) {
        onStatus(error?.message || 'Atomic payment delete failed');
        return;
      }
      onStatus('Payment reversal RPC migration is not installed yet. Deleting with legacy payment path for now.');
    }

    try {
      const deleted = await onCloudDelete?.('payments', payment.id);
      if (!deleted) {
        throw new Error(`${payment.invoiceNo || 'Payment'} delete failed`);
      }
      setPayments((items) => items.filter((item) => item.id !== payment.id));
      if (editingPayment?.id === payment.id) setEditingPayment(null);
      await logAudit(`Deleted payment ${payment.invoiceNo || payment.id}`, 'Payments');
      onStatus(`${payment.invoiceNo || 'Payment'} deleted`);
    } catch (error) {
      onStatus(error?.message || 'Payment delete failed');
    }
  };

  const saveSecurity = async (key, value) => {
    const nextSecurity = { ...security, id: 'current', [key]: value };
    try {
      await persistRecord('security_settings', nextSecurity, 'Security setting save failed');
    } catch (error) {
      onStatus(error?.message || 'Security setting save failed');
      return;
    }
    setSecurity(nextSecurity);
    await logAudit(`Security setting changed: ${key}`, 'Security');
  };

  const saveSubscriptionPlan = async (plan) => {
    const nextSubscription = { ...subscription, id: 'current', plan };
    try {
      await persistRecord('subscriptions', nextSubscription, 'Subscription save failed');
    } catch (error) {
      onStatus(error?.message || 'Subscription save failed');
      return;
    }
    setSubscription(nextSubscription);
    await logAudit(`Subscription plan changed to ${plan}`, 'Subscriptions');
  };

  const exportPrivacyData = () => {
    const data = { profile, invoices, customers, orders, employees, auditLogs, exportedAt: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `privacy-export-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (activeTab === 'mobile-app') {
    return (
      <section className="phase3-stack fade-in" id="mobile-app">
        <div className="phase3-hero">
          <div><span className="eyebrow">Android App & Offline Mode</span><h2>PWA install, offline-first cache, and background sync readiness</h2></div>
          <span className={navigator.onLine ? 'sync-pill online' : 'sync-pill offline'}>{navigator.onLine ? 'Online' : 'Offline'}</span>
        </div>
        <div className="summary-grid report-summary">
          <div className="summary-card"><span>PWA</span><strong>Enabled</strong></div>
          <div className="summary-card"><span>Offline Queue</span><strong>{offlineQueue.length}</strong></div>
          <div className="summary-card"><span>Background Sync</span><strong>Ready</strong></div>
          <div className="summary-card"><span>APK Path</span><strong>TWA-ready</strong></div>
        </div>
        <section className="panel">
          <h2>Mobile Deployment Checklist</h2>
          <div className="phase3-grid">
            <article className="phase3-card"><strong>Installable App</strong><p>Manifest and service worker are active. Android users can install from browser.</p></article>
            <article className="phase3-card"><strong>Android APK</strong><p>Use Bubblewrap/TWA with this PWA URL for Play Store APK packaging.</p></article>
            <article className="phase3-card"><strong>Offline App Shell</strong><p>The app can open offline, but production business entries require Supabase before saving.</p></article>
            <article className="phase3-card"><strong>Sync Readiness</strong><p>Queued sync is planned; current production records save only after Supabase confirms.</p></article>
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'whatsapp-automation') {
    const invoice = unpaidInvoices[0] || invoices[0];
    const customer = customers.find((item) => item.id === invoice?.customerId) || customers[0] || {};
    const templates = [
      ['Invoice Sent', `Hello ${customer.name || 'Customer'}, invoice ${invoice?.invoiceNo || ''} of ${formatCurrency(invoice?.total || 0)} has been sent by ${profile.name}.`],
      ['Payment Due', `Payment reminder: ${formatCurrency(invoice?.balance || invoice?.total || 0)} is due for ${invoice?.invoiceNo || 'your invoice'}.`],
      ['Overdue Reminder', `Your invoice is overdue. Please clear payment to avoid delay in future orders.`],
      ['Thank You Message', `Thank you for your payment. We appreciate your business with ${profile.name}.`],
      ['Order Update', `Your order status has been updated. Please contact us for details.`],
    ];
    return (
      <section className="phase3-stack fade-in" id="whatsapp-automation">
        <div className="phase3-hero"><div><span className="eyebrow">WhatsApp Business Automation</span><h2>Invoice, reminder, statement, and order update templates</h2></div></div>
        <section className="panel">
          <div className="phase3-grid">
            {templates.map(([title, message]) => (
              <article className="phase3-card" key={title}>
                <strong>{title}</strong>
                <p>{message}</p>
                <a className="share-entry-button" href={whatsappUrl(customer.mobile, message)} target="_blank" rel="noreferrer">Send WhatsApp</a>
              </article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'upi-payments') {
    return (
      <section className="phase3-stack fade-in" id="upi-payments">
        <div className="phase3-hero"><div><span className="eyebrow">UPI Payment System</span><h2>Dynamic UPI QR, Pay Now links, tracking, and reconciliation workspace</h2></div></div>
        <section className="content-grid">
          {unpaidInvoices.slice(0, 6).map((invoice) => {
            const uri = encodeUpi({ pa: profile.upiId || 'business@upi', pn: profile.name, am: invoice.balance || invoice.total, tn: invoice.invoiceNo });
            return (
          <article className="panel payment-card" key={invoice.id}>
                <div className="section-header"><div><h2>{invoice.invoiceNo}</h2><p className="panel-hint">{formatCurrency(invoice.balance || invoice.total)} pending</p></div><QrGrid value={uri} /></div>
                <div className="inline-actions">
                  <a className="manual-button restore-label" href={uri}>Pay Now</a>
                  <button className="secondary-button" type="button" onClick={() => recordPayment(invoice)}>Mark Paid</button>
                </div>
              </article>
            );
          })}
        </section>
        <section className="panel">
          <h2>{editingPayment ? 'Edit Payment' : 'Payment History'}</h2>
          {editingPayment && (
            <form onSubmit={savePaymentEdit} className="form-grid" key={editingPayment.id}>
              <input name="amount" type="number" defaultValue={editingPayment.amount || ''} placeholder="Amount" />
              <input name="date" type="date" defaultValue={editingPayment.date || today()} />
              <input name="mode" defaultValue={editingPayment.mode || 'UPI'} placeholder="Mode" />
              <input name="status" defaultValue={editingPayment.status || 'Marked Paid'} placeholder="Status" />
              <div className="inline-actions wide-field">
                <button className="manual-button" type="submit">Update Payment</button>
                <button className="secondary-button compact-button" type="button" onClick={() => setEditingPayment(null)}>Cancel</button>
              </div>
            </form>
          )}
          <div className="compact-list">
            {payments.length ? payments.map((payment) => (
              <article className="compact-item" key={payment.id}>
                <div><strong>{payment.invoiceNo || payment.id}</strong><p>{formatCurrency(payment.amount)} · {payment.mode} · {payment.date} · {payment.status}</p></div>
                <div className="voucher-actions">
                  <button className="share-entry-button" type="button" onClick={() => setEditingPayment(payment)}>Edit</button>
                  <button className="delete-entry-button" type="button" onClick={() => deletePayment(payment)}>Delete</button>
                </div>
              </article>
            )) : <div className="empty-state">No payments recorded yet.</div>}
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'orders') {
    return (
      <section className="phase3-stack fade-in" id="orders">
        <div className="phase3-hero"><div><span className="eyebrow">Order Management</span><h2>Production workflow, delivery timeline, and customer visibility</h2></div></div>
        <section className="content-grid">
          <article className="panel">
            <h2>{editingOrder ? 'Edit Order' : 'Create Order'}</h2>
            <form onSubmit={saveOrder} key={editingOrder?.id || 'new-order'}>
              <div className="form-grid">
                <input name="customer" defaultValue={editingOrder?.customer || ''} placeholder="Customer name" />
                <input name="mobile" defaultValue={editingOrder?.mobile || ''} placeholder="Mobile" />
                <input name="amount" type="number" defaultValue={editingOrder?.amount ?? ''} placeholder="Order amount" />
                <input name="deliveryDate" type="date" defaultValue={editingOrder?.deliveryDate || today()} />
                <div className="wide-field"><textarea name="details" defaultValue={editingOrder?.details || ''} placeholder="Order details" /></div>
              </div>
              <div className="inline-actions">
                <button className="manual-button" type="submit">{editingOrder ? 'Update Order' : 'Create Order'}</button>
                {editingOrder && <button className="secondary-button compact-button" type="button" onClick={() => setEditingOrder(null)}>Cancel</button>}
              </div>
            </form>
          </article>
          <article className="panel">
            <h2>Order Pipeline</h2>
            <div className="order-stage-strip">{ORDER_STAGES.map((stage) => <span key={stage}>{stage}</span>)}</div>
          </article>
        </section>
        <section className="panel">
          <div className="compact-list">
            {orders.map((order) => (
              <article className="compact-item" key={order.id}>
                <div><strong>{order.orderNo} · {order.customer}</strong><p>{order.status} · Delivery {order.deliveryDate} · {formatCurrency(order.amount)}</p><p>{order.timeline[0]?.date}: {order.timeline[0]?.note}</p></div>
                <div className="voucher-actions">
                  <button className="share-entry-button" type="button" onClick={() => advanceOrder(order)}>Next Stage</button>
                  <button className="share-entry-button" type="button" onClick={() => setEditingOrder(order)}>Edit</button>
                  <a className="share-entry-button" href={whatsappUrl(order.mobile, `Your order ${order.orderNo} status: ${order.status}`)} target="_blank" rel="noreferrer">Update Customer</a>
                  <button className="delete-entry-button" type="button" onClick={() => deleteOrder(order)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'voice-bookkeeper') {
    return (
      <section className="phase3-stack fade-in" id="voice-bookkeeper">
        <div className="phase3-hero"><div><span className="eyebrow">AI Voice Bookkeeper</span><h2>Advanced command center for invoices, insights, receivables, and business issues</h2></div></div>
        <section className="panel">
          <div className="phase3-grid">
            <article className="phase3-card"><strong>Create invoice command</strong><p>"Create invoice for Rahul worth 5000" opens invoice workflow and can add customer locally.</p><a href="#invoices">Open Invoices</a></article>
            <article className="phase3-card"><strong>Profit question</strong><p>Monthly profit is calculated from local vouchers and invoices.</p><strong>{formatCurrency(vouchers.filter((v) => (v.date || '').slice(0, 7) === today().slice(0, 7)).reduce((sum, v) => sum + (v.type === 'Receipt' || v.type === 'Sales' ? v.amount : -v.amount), 0))}</strong></article>
            <article className="phase3-card"><strong>Pending collections</strong><p>{pendingCollections.length} customers need collection follow-up.</p><a href="#crm">Open CRM</a></article>
            <article className="phase3-card"><strong>Issues needing attention</strong>{businessIssues.length ? businessIssues.map((issue) => <p key={issue}>{issue}</p>) : <p>No urgent issues detected.</p>}</article>
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'employees') {
    const currentEmployee = editingEmployee || {};
    const employeeRole = String(authUser?.role || '').toLowerCase();
    const staffEmployeeIds = new Set(employees
      .filter((employee) => String(employee.email || '').toLowerCase() === String(authUser?.email || '').toLowerCase())
      .map((employee) => employee.id));
    const canManageEmployees = ['owner', 'manager'].includes(employeeRole);
    const canViewEmployeeMaster = ['owner', 'manager', 'accountant'].includes(employeeRole) || staffEmployeeIds.size > 0;
    const canManageAttendance = ['owner', 'manager'].includes(employeeRole);
    const canManageLeave = ['owner', 'manager'].includes(employeeRole);
    const canManageHolidays = ['owner', 'manager'].includes(employeeRole);
    const canViewSalary = ['owner', 'manager', 'accountant'].includes(employeeRole);
    const accessibleEmployees = staffEmployeeIds.size > 0 && !['owner', 'manager', 'accountant'].includes(employeeRole)
      ? employees.filter((employee) => staffEmployeeIds.has(employee.id))
      : employees;
    const visiblePaginatedEmployees = staffEmployeeIds.size > 0 && !['owner', 'manager', 'accountant'].includes(employeeRole)
      ? paginatedEmployees.filter((employee) => staffEmployeeIds.has(employee.id))
      : paginatedEmployees;
    const visibleAttendance = staffEmployeeIds.size > 0 && !canManageAttendance
      ? filteredAttendance.filter((entry) => staffEmployeeIds.has(entry.employeeId))
      : filteredAttendance;
    const visibleLeaveRequests = staffEmployeeIds.size > 0 && !canManageLeave
      ? filteredLeaveRequests.filter((request) => staffEmployeeIds.has(request.employeeId))
      : filteredLeaveRequests;

    return (
      <section className="phase3-stack fade-in" id="employees">
        <div className="phase3-hero hrms-hero">
          <div>
            <span className="eyebrow">HRMS Phase A</span>
            <h2>Employee Master and Professional HR Profiles</h2>
            <p>Foundation for HRMS with structured employee records, profile tabs, notes, and role-aware access.</p>
          </div>
          <strong>{employees.filter((employee) => (employee.status || 'Active') === 'Active').length} active</strong>
        </div>

        {!canViewEmployeeMaster && (
          <section className="notice error">
            Your current role does not have unrestricted employee access. Contact the owner for HRMS permissions.
          </section>
        )}

        {canViewEmployeeMaster && <section className="hrms-summary-grid">
          <div className="summary-card"><span>Total Employees</span><strong>{accessibleEmployees.length}</strong></div>
          <div className="summary-card"><span>Active</span><strong>{accessibleEmployees.filter((employee) => (employee.status || 'Active') === 'Active').length}</strong></div>
          <div className="summary-card"><span>Departments</span><strong>{Math.max(0, employeeDepartments.length - 1)}</strong></div>
          <div className="summary-card"><span>Monthly Payroll</span><strong>{canViewSalary ? formatCurrency(payrollTotal) : 'Restricted'}</strong></div>
        </section>}

        {canManageEmployees && (
          <section className="panel hrms-master-panel">
            <div className="section-header">
              <div>
                <h2>{editingEmployee ? 'Edit Employee Master' : 'Add Employee Master'}</h2>
                <p className="panel-hint">Capture basic, work, salary, shift, reporting, and internal notes.</p>
              </div>
              <span>{editingEmployee ? 'Editing' : 'New'}</span>
            </div>
            <form onSubmit={saveEmployee} key={editingEmployee?.id || 'new-employee'}>
              <div className="form-grid hrms-form-grid">
                <div>
                  <label className="field-label" htmlFor="employee_id">Employee ID</label>
                  <input id="employee_id" name="employee_id" defaultValue={employeeCode(currentEmployee) || createEmployeeCode(employees)} placeholder="EMP-0001" />
                </div>
                <div>
                  <label className="field-label" htmlFor="full_name">Full Name</label>
                  <input id="full_name" name="full_name" defaultValue={employeeDisplayName(currentEmployee) === 'Employee' ? '' : employeeDisplayName(currentEmployee)} placeholder="Employee full name" required />
                </div>
                <div>
                  <label className="field-label" htmlFor="mobile_number">Mobile Number</label>
                  <input id="mobile_number" name="mobile_number" defaultValue={employeeMobile(currentEmployee)} placeholder="+91 mobile number" required />
                </div>
                <div>
                  <label className="field-label" htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" defaultValue={currentEmployee.email || ''} placeholder="employee@example.com" />
                </div>
                <div className="wide-field">
                  <label className="field-label" htmlFor="address">Address</label>
                  <textarea id="address" name="address" defaultValue={currentEmployee.address || ''} placeholder="Employee address" />
                </div>
                <div>
                  <label className="field-label" htmlFor="department">Department</label>
                  <input id="department" name="department" defaultValue={currentEmployee.department || ''} placeholder="Inventory, Sales, Admin" />
                </div>
                <div>
                  <label className="field-label" htmlFor="designation">Designation</label>
                  <input id="designation" name="designation" defaultValue={employeeDesignation(currentEmployee)} placeholder="Store Manager" />
                </div>
                <div>
                  <label className="field-label" htmlFor="joining_date">Joining Date</label>
                  <input id="joining_date" name="joining_date" type="date" defaultValue={currentEmployee.joiningDate || currentEmployee.joining_date || ''} />
                </div>
                <div>
                  <label className="field-label" htmlFor="salary">Salary</label>
                  <input id="salary" name="salary" type="number" min="0" defaultValue={currentEmployee.salary ?? ''} placeholder="Monthly salary" />
                </div>
                <div>
                  <label className="field-label" htmlFor="advance">Advance</label>
                  <input id="advance" name="advance" type="number" min="0" defaultValue={currentEmployee.advance ?? ''} placeholder="Advance paid" />
                </div>
                <div>
                  <label className="field-label" htmlFor="shift_timing">Shift Timing</label>
                  <input id="shift_timing" name="shift_timing" defaultValue={currentEmployee.shiftTiming || currentEmployee.shift_timing || ''} placeholder="10:00 AM - 7:00 PM" />
                </div>
                <div>
                  <label className="field-label" htmlFor="reporting_manager">Reporting Manager</label>
                  <input id="reporting_manager" name="reporting_manager" defaultValue={currentEmployee.reportingManager || currentEmployee.reporting_manager || ''} placeholder="Manager name" />
                </div>
                <div>
                  <label className="field-label" htmlFor="status">Status</label>
                  <select id="status" name="status" defaultValue={currentEmployee.status || 'Active'}>
                    {EMPLOYEE_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
                <div className="wide-field">
                  <label className="field-label" htmlFor="notes">Description / Notes</label>
                  <textarea
                    id="notes"
                    name="notes"
                    defaultValue={currentEmployee.notes || currentEmployee.description || ''}
                    placeholder="Good performer, handles inventory and customer support. Eligible for increment after December 2026."
                  />
                </div>
              </div>
              <div className="inline-actions">
                <button className="manual-button" type="submit">{editingEmployee ? 'Update Employee' : 'Save Employee'}</button>
                {editingEmployee && <button className="secondary-button compact-button" type="button" onClick={() => setEditingEmployee(null)}>Cancel</button>}
              </div>
            </form>
          </section>
        )}

        {canViewEmployeeMaster && <section className="panel hrms-directory-panel">
          <div className="section-header">
            <div>
              <h2>Employee Directory</h2>
              <p className="panel-hint">Search, filter, and open employee profiles.</p>
            </div>
            <span>{filteredEmployees.length} results</span>
          </div>
          <div className="hrms-toolbar">
            <input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="Search employee, ID, department, mobile..." />
            <select value={employeeDepartmentFilter} onChange={(event) => setEmployeeDepartmentFilter(event.target.value)}>
              {employeeDepartments.map((department) => <option key={department}>{department}</option>)}
            </select>
            <select value={employeeStatusFilter} onChange={(event) => setEmployeeStatusFilter(event.target.value)}>
              <option>All</option>
              {EMPLOYEE_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>

          {accessibleEmployees.length === 0 ? (
            <div className="empty-state">No employees yet. Add your first employee master record.</div>
          ) : visiblePaginatedEmployees.length === 0 ? (
            <div className="empty-state">No employees match the selected filters.</div>
          ) : (
            <div className="hrms-employee-grid">
              {visiblePaginatedEmployees.map((employee) => {
                const todayEntry = attendanceByEmployeeToday.get(employee.id);
                return (
                  <article className={`hrms-employee-card ${selectedEmployee?.id === employee.id ? 'selected' : ''}`} key={employee.id}>
                    <div className="hrms-employee-card-head">
                      <div className="hrms-avatar">{employeeDisplayName(employee).slice(0, 1).toUpperCase()}</div>
                      <div>
                        <strong>{employeeDisplayName(employee)}</strong>
                        <p>{employeeCode(employee)} · {employee.department || 'No department'}</p>
                      </div>
                      <span className={`hrms-status ${(employee.status || 'Active').toLowerCase()}`}>{employee.status || 'Active'}</span>
                    </div>
                    <div className="hrms-employee-meta">
                      <span>{employeeDesignation(employee) || 'Designation pending'}</span>
                      <span>{employeeMobile(employee) || 'Mobile pending'}</span>
                      {canViewSalary && <span>{formatCurrency(employee.salary)} salary</span>}
                      <span className={`attendance-pill ${todayEntry?.status === 'Absent' ? 'absent' : todayEntry?.status === 'Present' ? 'present' : ''}`}>
                        {attendanceStatusLabel(todayEntry?.status)} today
                      </span>
                    </div>
                    <div className="voucher-actions">
                      <button className="share-entry-button" type="button" onClick={() => { setSelectedEmployee(employee); setEmployeeProfileTab(EMPLOYEE_PROFILE_TABS[0]); }}>Profile</button>
                      {canManageEmployees && <button className="share-entry-button" type="button" onClick={() => setEditingEmployee(employee)}>Edit</button>}
                      {canManageEmployees && <button className="share-entry-button" type="button" onClick={() => markAttendance(employee, 'Present')}>Present</button>}
                      {canManageEmployees && <button className="share-entry-button" type="button" onClick={() => markAttendance(employee, 'Absent')}>Absent</button>}
                      {canManageEmployees && <button className="delete-entry-button" type="button" onClick={() => deleteEmployee(employee)}>Delete</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="hrms-pagination">
            <button className="secondary-button compact-button" type="button" disabled={employeePage <= 1} onClick={() => setEmployeePage((page) => Math.max(1, page - 1))}>Previous</button>
            <span>Page {employeePage} of {employeePageCount}</span>
            <button className="secondary-button compact-button" type="button" disabled={employeePage >= employeePageCount} onClick={() => setEmployeePage((page) => Math.min(employeePageCount, page + 1))}>Next</button>
          </div>
        </section>}

        {canViewEmployeeMaster && (
          <section className="panel hrms-phaseb-panel">
            <div className="section-header">
              <div>
                <h2>Attendance</h2>
                <p className="panel-hint">Daily attendance entry, monthly filters, counts, and quick calendar view.</p>
              </div>
              <span>{visibleAttendance.length} records</span>
            </div>
            <div className="hrms-summary-grid">
              <div className="summary-card"><span>Present</span><strong>{attendanceSummary.present}</strong></div>
              <div className="summary-card"><span>Absent</span><strong>{attendanceSummary.absent}</strong></div>
              <div className="summary-card"><span>Late Marks</span><strong>{attendanceSummary.late}</strong></div>
              <div className="summary-card"><span>Filtered Records</span><strong>{visibleAttendance.length}</strong></div>
            </div>

            <div className="hrms-toolbar">
              <select value={attendanceEmployeeFilter} onChange={(event) => setAttendanceEmployeeFilter(event.target.value)}>
                <option value="All">All employees</option>
                {accessibleEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employeeDisplayName(employee)}</option>)}
              </select>
              <input type="month" value={attendanceMonthFilter} onChange={(event) => setAttendanceMonthFilter(event.target.value)} />
              <button className="secondary-button compact-button" type="button" onClick={() => setAttendanceMonthFilter(monthKey())}>This Month</button>
            </div>

            {canManageAttendance && (
              <form className="hrms-inline-form" onSubmit={saveAttendanceEntry} key={editingAttendance?.id || 'attendance-new'}>
                <select name="employeeId" defaultValue={editingAttendance?.employeeId || accessibleEmployees[0]?.id || ''} required>
                  <option value="" disabled>Select employee</option>
                  {accessibleEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employeeDisplayName(employee)}</option>)}
                </select>
                <input name="attendanceDate" type="date" defaultValue={editingAttendance?.attendanceDate || editingAttendance?.date || today()} required />
                <input name="inTime" type="time" defaultValue={editingAttendance?.inTime || editingAttendance?.in_time || ''} />
                <input name="outTime" type="time" defaultValue={editingAttendance?.outTime || editingAttendance?.out_time || ''} />
                <input name="workingHours" type="number" min="0" step="0.25" defaultValue={editingAttendance?.workingHours ?? editingAttendance?.working_hours ?? ''} placeholder="Hours" />
                <select name="status" defaultValue={editingAttendance?.status || 'Present'}>
                  {ATTENDANCE_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
                <label className="hrms-check"><input name="lateMark" type="checkbox" defaultChecked={Boolean(editingAttendance?.lateMark || editingAttendance?.late_mark)} /> Late</label>
                <input name="remarks" defaultValue={editingAttendance?.remarks || ''} placeholder="Remarks" />
                <button className="manual-button" type="submit">{editingAttendance ? 'Update Attendance' : 'Save Attendance'}</button>
                {editingAttendance && <button className="secondary-button compact-button" type="button" onClick={() => setEditingAttendance(null)}>Cancel</button>}
              </form>
            )}

            <div className="hrms-record-grid">
              {visibleAttendance.length === 0 ? <div className="empty-state">No attendance records for this filter.</div> : visibleAttendance.slice(0, 12).map((entry) => (
                <article className="hrms-mini-card" key={entry.id}>
                  <div>
                    <strong>{entry.name || employees.find((employee) => employee.id === entry.employeeId)?.name || 'Employee'}</strong>
                    <p>{entry.attendanceDate || entry.date} · {entry.inTime || entry.in_time || '--'} to {entry.outTime || entry.out_time || '--'}</p>
                  </div>
                  <span className={`attendance-pill ${entry.status === 'Absent' ? 'absent' : entry.status === 'Present' ? 'present' : ''}`}>{attendanceStatusLabel(entry.status)}</span>
                  {Boolean(entry.lateMark || entry.late_mark) && <span className="hrms-status inactive">Late</span>}
                  {canManageAttendance && <button className="share-entry-button" type="button" onClick={() => setEditingAttendance(entry)}>Edit</button>}
                </article>
              ))}
            </div>
          </section>
        )}

        {canViewEmployeeMaster && (
          <section className="panel hrms-phaseb-panel">
            <div className="section-header">
              <div>
                <h2>Leave Management</h2>
                <p className="panel-hint">SL, CL, and PL requests with approval flow and balance tracking.</p>
              </div>
              <span>{visibleLeaveRequests.length} requests</span>
            </div>

            <div className="hrms-record-grid">
              {LEAVE_TYPES.map((type) => {
                const totalRemaining = leaveBalances
                  .filter((balance) => balance.leaveType === type.id)
                  .reduce((sum, balance) => sum + Number(balance.remainingLeaves ?? balance.remaining_leaves ?? type.allocation), 0);
                return (
                  <article className="hrms-mini-card" key={type.id}>
                    <strong>{type.id}</strong>
                    <p>{type.label}</p>
                    <span>{totalRemaining} remaining</span>
                  </article>
                );
              })}
            </div>

            <form className="hrms-inline-form" onSubmit={saveLeaveRequest}>
              <select name="employeeId" defaultValue={accessibleEmployees[0]?.id || ''} required>
                <option value="" disabled>Select employee</option>
                {accessibleEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employeeDisplayName(employee)}</option>)}
              </select>
              <select name="leaveType" defaultValue="SL">{LEAVE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.id} - {type.label}</option>)}</select>
              <input name="startDate" type="date" required />
              <input name="endDate" type="date" required />
              <input name="reason" placeholder="Reason" />
              <button className="manual-button" type="submit">Apply Leave</button>
            </form>

            <div className="hrms-toolbar">
              <select value={leaveEmployeeFilter} onChange={(event) => setLeaveEmployeeFilter(event.target.value)}>
                <option value="All">All employees</option>
                {accessibleEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employeeDisplayName(employee)}</option>)}
              </select>
              <select value={leaveStatusFilter} onChange={(event) => setLeaveStatusFilter(event.target.value)}>
                <option>All</option>
                {LEAVE_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select value={leaveTypeFilter} onChange={(event) => setLeaveTypeFilter(event.target.value)}>
                <option>All</option>
                {LEAVE_TYPES.map((type) => <option key={type.id}>{type.id}</option>)}
              </select>
            </div>

            <div className="hrms-record-grid">
              {visibleLeaveRequests.length === 0 ? <div className="empty-state">No leave requests yet.</div> : visibleLeaveRequests.map((request) => (
                <article className="hrms-mini-card" key={request.id}>
                  <div>
                    <strong>{request.employeeName}</strong>
                    <p>{request.leaveType} · {request.startDate} to {request.endDate} · {request.totalDays} days</p>
                    <p>{request.reason || 'No reason added'}</p>
                  </div>
                  <span className={`hrms-status ${request.status === 'Rejected' ? 'inactive' : ''}`}>{request.status}</span>
                  {canManageLeave && request.status === 'Pending' && (
                    <div className="voucher-actions">
                      <button className="share-entry-button" type="button" onClick={() => decideLeaveRequest(request, 'Approved')}>Approve</button>
                      <button className="delete-entry-button" type="button" onClick={() => decideLeaveRequest(request, 'Rejected')}>Reject</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {canViewEmployeeMaster && (
          <section className="panel hrms-phaseb-panel">
            <div className="section-header">
              <div>
                <h2>Holiday Calendar</h2>
                <p className="panel-hint">Company holidays visible to employees, with owner/manager management.</p>
              </div>
              <span>{holidays.length} holidays</span>
            </div>

            {canManageHolidays && (
              <form className="hrms-inline-form" onSubmit={saveHoliday} key={editingHoliday?.id || 'holiday-new'}>
                <input name="holidayName" defaultValue={editingHoliday?.holidayName || editingHoliday?.holiday_name || ''} placeholder="Holiday name" required />
                <input name="holidayDate" type="date" defaultValue={editingHoliday?.holidayDate || editingHoliday?.holiday_date || ''} required />
                <input name="description" defaultValue={editingHoliday?.description || ''} placeholder="Description" />
                <button className="manual-button" type="submit">{editingHoliday ? 'Update Holiday' : 'Add Holiday'}</button>
                {editingHoliday && <button className="secondary-button compact-button" type="button" onClick={() => setEditingHoliday(null)}>Cancel</button>}
              </form>
            )}

            <div className="hrms-holiday-grid">
              {sortedHolidays.length === 0 ? <div className="empty-state">No holidays added yet.</div> : sortedHolidays.map((holiday) => (
                <article className="hrms-holiday-card" key={holiday.id}>
                  <time>{holiday.holidayDate || holiday.holiday_date}</time>
                  <strong>{holiday.holidayName || holiday.holiday_name}</strong>
                  <p>{holiday.description || 'Company holiday'}</p>
                  {canManageHolidays && (
                    <div className="voucher-actions">
                      <button className="share-entry-button" type="button" onClick={() => setEditingHoliday(holiday)}>Edit</button>
                      <button className="delete-entry-button" type="button" onClick={() => deleteHoliday(holiday)}>Delete</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {canViewEmployeeMaster && selectedEmployee && (
          <section className="panel hrms-profile-panel">
            <div className="hrms-profile-header">
              <div className="hrms-avatar large">{employeeDisplayName(selectedEmployee).slice(0, 1).toUpperCase()}</div>
              <div>
                <span className="eyebrow">Employee Profile</span>
                <h2>{employeeDisplayName(selectedEmployee)}</h2>
                <p>{employeeCode(selectedEmployee)} · {employeeDesignation(selectedEmployee) || 'Designation pending'} · {selectedEmployee.department || 'Department pending'}</p>
              </div>
              <button className="secondary-button compact-button" type="button" onClick={() => setSelectedEmployee(null)}>Close</button>
            </div>
            <div className="hrms-tabs">
              {EMPLOYEE_PROFILE_TABS.map((tab) => (
                <button className={employeeProfileTab === tab ? 'active' : ''} key={tab} type="button" onClick={() => setEmployeeProfileTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>
            <div className="hrms-tab-card">
              {employeeProfileTab === 'Personal Information' && (
                <dl className="hrms-detail-grid">
                  <div><dt>Full Name</dt><dd>{employeeDisplayName(selectedEmployee)}</dd></div>
                  <div><dt>Mobile</dt><dd>{employeeMobile(selectedEmployee) || 'Not added'}</dd></div>
                  <div><dt>Email</dt><dd>{selectedEmployee.email || 'Not added'}</dd></div>
                  <div><dt>Address</dt><dd>{selectedEmployee.address || 'Not added'}</dd></div>
                </dl>
              )}
              {employeeProfileTab === 'Work Information' && (
                <dl className="hrms-detail-grid">
                  <div><dt>Employee ID</dt><dd>{employeeCode(selectedEmployee)}</dd></div>
                  <div><dt>Department</dt><dd>{selectedEmployee.department || 'Not added'}</dd></div>
                  <div><dt>Designation</dt><dd>{employeeDesignation(selectedEmployee) || 'Not added'}</dd></div>
                  <div><dt>Joining Date</dt><dd>{selectedEmployee.joiningDate || selectedEmployee.joining_date || 'Not added'}</dd></div>
                  <div><dt>Shift Timing</dt><dd>{selectedEmployee.shiftTiming || selectedEmployee.shift_timing || 'Not added'}</dd></div>
                  <div><dt>Reporting Manager</dt><dd>{selectedEmployee.reportingManager || selectedEmployee.reporting_manager || 'Not added'}</dd></div>
                  <div><dt>Status</dt><dd>{selectedEmployee.status || 'Active'}</dd></div>
                </dl>
              )}
              {employeeProfileTab === 'Salary Information' && (
                <dl className="hrms-detail-grid">
                  <div><dt>Monthly Salary</dt><dd>{canViewSalary ? formatCurrency(selectedEmployee.salary) : 'Restricted'}</dd></div>
                  <div><dt>Advance</dt><dd>{canViewSalary ? formatCurrency(selectedEmployee.advance) : 'Restricted'}</dd></div>
                  <div><dt>Salary History</dt><dd>Placeholder for HRMS Phase B.</dd></div>
                </dl>
              )}
              {employeeProfileTab === 'Leave Information' && (
                <div className="hrms-record-grid">
                  {LEAVE_TYPES.map((type) => {
                    const balance = leaveBalancesByEmployee.get(`${selectedEmployee.id}-${type.id}`);
                    return (
                      <article className="hrms-mini-card" key={type.id}>
                        <strong>{type.id}</strong>
                        <p>{type.label}</p>
                        <span>{Number(balance?.remainingLeaves ?? balance?.remaining_leaves ?? type.allocation)} remaining</span>
                      </article>
                    );
                  })}
                  {leaveRequests.filter((request) => request.employeeId === selectedEmployee.id).slice(0, 4).map((request) => (
                    <article className="hrms-mini-card" key={request.id}>
                      <strong>{request.status}</strong>
                      <p>{request.leaveType} · {request.startDate} to {request.endDate}</p>
                    </article>
                  ))}
                </div>
              )}
              {employeeProfileTab === 'Attendance' && (
                <div className="hrms-record-grid">
                  {validAttendance.filter((entry) => entry.employeeId === selectedEmployee.id).slice(0, 8).length === 0 ? (
                    <div className="empty-state">No attendance records for this employee yet.</div>
                  ) : validAttendance.filter((entry) => entry.employeeId === selectedEmployee.id).slice(0, 8).map((entry) => (
                    <article className="hrms-mini-card" key={entry.id}>
                      <strong>{entry.attendanceDate || entry.date}</strong>
                      <p>{entry.status} · {entry.workingHours ?? entry.working_hours ?? 0} hours</p>
                      <span className={`attendance-pill ${entry.status === 'Absent' ? 'absent' : entry.status === 'Present' ? 'present' : ''}`}>{attendanceStatusLabel(entry.status)}</span>
                    </article>
                  ))}
                </div>
              )}
              {employeeProfileTab === 'Documents' && <div className="empty-state">Document storage placeholder for a later HRMS phase.</div>}
              {employeeProfileTab === 'Notes / Description' && (
                <article className="hrms-notes-card">
                  <strong>Description / Notes</strong>
                  <p>{selectedEmployee.notes || selectedEmployee.description || 'No notes added yet.'}</p>
                </article>
              )}
            </div>
          </section>
        )}
      </section>
    );
  }

  if (activeTab === 'subscriptions') {
    const plans = [
      ['Free', '25 invoices, 1 user, core accounting'],
      ['Pro', 'Unlimited invoices, automation, AI insights'],
      ['Business', 'Multi-business, staff roles, accountant portal'],
    ];
    return (
      <section className="phase3-stack fade-in" id="subscriptions">
        <div className="phase3-hero"><div><span className="eyebrow">Subscription System</span><h2>Plans, usage limits, feature access, and billing dashboard</h2></div><strong>{subscription.plan}</strong></div>
        <div className="phase3-grid">
          {plans.map(([plan, details]) => (
            <article className={`phase3-card ${subscription.plan === plan ? 'selected-plan' : ''}`} key={plan}>
              <strong>{plan}</strong><p>{details}</p>
              <button className="secondary-button compact-button" type="button" onClick={() => saveSubscriptionPlan(plan)}>Select Plan</button>
            </article>
          ))}
        </div>
        <section className="panel"><h2>Usage</h2><SmallUsage label="Invoices" value={invoices.length} max={subscription.plan === 'Free' ? 25 : 500} /><SmallUsage label="Users" value={employees.length + 1} max={subscription.plan === 'Business' ? 25 : subscription.plan === 'Pro' ? 5 : 1} /></section>
      </section>
    );
  }

  if (activeTab === 'accountant-portal') {
    return (
      <section className="phase3-stack fade-in" id="accountant-portal">
        <div className="phase3-hero"><div><span className="eyebrow">CA / Accountant Portal</span><h2>Read-only financial review access for GST, statements, and analysis</h2></div></div>
        <section className="panel">
          <div className="phase3-grid">
            <article className="phase3-card"><strong>Read Reports</strong><p>Accountant can review reports without editing source data.</p><a href="#reports">Reports</a></article>
            <article className="phase3-card"><strong>Download Statements</strong><p>Export ledgers, day book, and customer statements.</p><a href="#party-statement">Statements</a></article>
            <article className="phase3-card"><strong>GST Review</strong><p>Review sales/purchase GST reports.</p><a href="#gst">GST Center</a></article>
            <article className="phase3-card"><strong>Financial Analysis</strong><p>View analytics and AI risk alerts.</p><a href="#analytics">Analytics</a></article>
          </div>
        </section>
      </section>
    );
  }

  if (activeTab === 'security-center') {
    const controls = [
      ['googleLogin', 'Google Login'],
      ['jwtSessions', 'JWT Authentication'],
      ['refreshTokens', 'Refresh Tokens'],
      ['twoFactor', 'Two Factor Authentication'],
      ['encryptionAtRest', 'Encrypt Sensitive Data At Rest'],
      ['csrfProtection', 'CSRF Protection'],
      ['rateLimit', 'Rate Limiting'],
      ['passwordResetProtection', 'Password Reset Security'],
    ];
    return (
      <section className="phase3-stack fade-in" id="security-center">
        <div className="phase3-hero"><div><span className="eyebrow">Enterprise Security Upgrade</span><h2>RBAC, audit logs, device management, privacy controls, and monitoring readiness</h2></div></div>
        <section className="content-grid">
          <article className="panel">
            <h2>Security Controls</h2>
            <div className="phase3-grid">
              <article className="phase3-card">
                <strong>Email Verification</strong>
                <p>{authUser?.emailVerified ? 'Verified email access is active.' : 'Production sensitive actions require a verified Supabase email.'}</p>
                {!authUser?.emailVerified && (
                  <button className="secondary-button compact-button" type="button" onClick={onResendVerification}>
                    Resend Verification
                  </button>
                )}
              </article>
              <article className="phase3-card">
                <strong>MFA Readiness</strong>
                <p>{security.twoFactor ? 'MFA option enabled in account policy settings.' : 'Enable MFA in Supabase Auth before public launch.'}</p>
              </article>
              <article className="phase3-card">
                <strong>Supabase RLS</strong>
                <p>{supabaseEnabled ? 'Client is Supabase-ready. Row Level Security keeps every user scoped to their own business rows.' : 'Supabase is not configured in this environment.'}</p>
              </article>
            </div>
            {controls.map(([key, label]) => (
              <label className="toggle-row" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(security[key])} onChange={(event) => saveSecurity(key, event.target.checked)} /></label>
            ))}
            <label className="field-label">Session Expiry (minutes)</label>
            <input type="number" value={security.sessionExpiryMinutes} onChange={(event) => saveSecurity('sessionExpiryMinutes', Number(event.target.value) || 30)} />
          </article>
          <article className="panel">
            <h2>RBAC Roles</h2>
            <div className="phase3-grid roles-grid">{ROLES.map((role) => <article className="phase3-card" key={role}><strong>{role}</strong><p>{role === 'Owner' ? 'Full access' : role === 'Accountant' ? 'Reports, GST, analysis' : role === 'Manager' ? 'Operations and invoices' : 'Entry-level access'}</p></article>)}</div>
          </article>
        </section>
        <section className="content-grid">
          <article className="panel"><h2>Device Management</h2><div className="compact-list">{devices.map((device) => <article className="compact-item" key={device.id}><div><strong>{device.name}</strong><p>{device.lastLogin}</p></div><span className="status-pill paid">{device.trusted ? 'Trusted' : 'Review'}</span></article>)}</div></article>
          <article className="panel"><h2>Privacy & Compliance</h2><div className="inline-actions"><button className="secondary-button" type="button" onClick={exportPrivacyData}>Export Data</button><button className="warning-button" type="button" onClick={() => onStatus('Data deletion request logged. Backend workflow required for production deletion.')}>Request Deletion</button></div><p className="panel-hint">Consent, data export, and deletion request controls are ready for backend policy enforcement.</p></article>
        </section>
        <section className="panel"><h2>Audit Logs & Monitoring</h2><div className="compact-list">{auditLogs.length ? auditLogs.map((log) => <article className="compact-item" key={log.id}><div><strong>{log.action}</strong><p>{log.area} · {log.user} · {log.date}</p></div></article>) : <div className="empty-state">No audit activity yet.</div>}</div></section>
      </section>
    );
  }

  return null;
}

function SmallUsage({ label, value, max }) {
  const percent = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="usage-row">
      <div><strong>{label}</strong><span>{value} / {max}</span></div>
      <div className="insight-progress-bar"><div className="insight-progress-fill primary" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}


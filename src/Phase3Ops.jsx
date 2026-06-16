import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { normalizeAmount, sanitizeText, validateEmail, validatePhone } from './security.js';
import { readScopedString, writeScopedString } from './storageScope.js';
import { createEmployeeLogin, resetEmployeePassword, disableEmployeeLogin } from './supabaseClient.js';

const ORDER_KEY = 'phase3Orders';
const EMPLOYEE_KEY = 'phase3Employees';
const ATTENDANCE_KEY = 'phase3Attendance';
const LEAVE_BALANCE_KEY = 'phase3LeaveBalances';
const LEAVE_REQUEST_KEY = 'phase3LeaveRequests';
const LEAVE_POLICY_KEY = 'phase3LeavePolicies';
const HOLIDAY_KEY = 'phase3Holidays';
const SALARY_HISTORY_KEY = 'phase3SalaryHistory';
const PAYSLIP_KEY = 'phase3Payslips';
const EMPLOYEE_DOCUMENT_KEY = 'phase3EmployeeDocuments';
const SUBSCRIPTION_KEY = 'phase3Subscription';
const PROFILE_REQUEST_KEY = 'phase3ProfileRequests';
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
const SALARY_TYPES = ['Monthly', 'Daily', 'Hourly'];
const SALARY_STATUSES = ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Paid'];
const PAYSLIP_STATUSES = ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Paid'];
const DOCUMENT_CATEGORIES = [
  'Offer Letter',
  'Appointment Letter',
  'Experience Letter',
  'Relieving Letter',
  'Payslips',
  'Increment Letters',
  'Warning Letters',
  'Aadhaar Card',
  'PAN Card',
  'Bank Details',
  'Educational Certificates',
  'Other Documents',
];
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
  cloudLeavePolicies,
  cloudHolidays,
  cloudSalaryHistory,
  cloudPayslips,
  cloudEmployeeDocuments,
  cloudProfileRequests,
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
  onHrmsDocumentUpload,
  onHrmsDocumentDelete,
  onHrmsDocumentUrl,
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
  const [leavePolicies, setLeavePolicies] = useState(() => readArray(LEAVE_POLICY_KEY));
  const [holidays, setHolidays] = useState(() => readArray(HOLIDAY_KEY));
  const [salaryHistory, setSalaryHistory] = useState(() => readArray(SALARY_HISTORY_KEY));
  const [payslips, setPayslips] = useState(() => readArray(PAYSLIP_KEY));
  const [employeeDocuments, setEmployeeDocuments] = useState(() => readArray(EMPLOYEE_DOCUMENT_KEY));
  const [auditLogs, setAuditLogs] = useState(() => readArray(AUDIT_KEY));
  const [payments, setPayments] = useState(() => readArray(PAYMENT_KEY));
  const [profileRequests, setProfileRequests] = useState(() => readArray(PROFILE_REQUEST_KEY));
  const [offlineQueue, setOfflineQueue] = useState(() => readArray(OFFLINE_QUEUE_KEY));
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [requestUpdateModal, setRequestUpdateModal] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeProfileTab, setEmployeeProfileTab] = useState(EMPLOYEE_PROFILE_TABS[0]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState('All');
  
  const [loginManageModal, setLoginManageModal] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginStatusMsg, setLoginStatusMsg] = useState({ text: '', type: '' });
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('All');
  const [employeePage, setEmployeePage] = useState(1);
  const [attendanceEmployeeFilter, setAttendanceEmployeeFilter] = useState('All');
  const [attendanceMonthFilter, setAttendanceMonthFilter] = useState(monthKey());
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editingLeavePolicy, setEditingLeavePolicy] = useState(null);
  const [leaveEmployeeFilter, setLeaveEmployeeFilter] = useState('All');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('All');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All');
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editingSalaryRecord, setEditingSalaryRecord] = useState(null);
  const [editingPayslip, setEditingPayslip] = useState(null);
  const [generatingPayslipId, setGeneratingPayslipId] = useState(null);
  const [rejectionModal, setRejectionModal] = useState(null);
  const [editingEmployeeDocument, setEditingEmployeeDocument] = useState(null);
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState('All');
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
  useEffect(() => writeArray(LEAVE_POLICY_KEY, leavePolicies), [leavePolicies]);
  useEffect(() => writeArray(HOLIDAY_KEY, holidays), [holidays]);
  useEffect(() => writeArray(SALARY_HISTORY_KEY, salaryHistory), [salaryHistory]);
  useEffect(() => writeArray(PAYSLIP_KEY, payslips), [payslips]);
  useEffect(() => writeArray(EMPLOYEE_DOCUMENT_KEY, employeeDocuments), [employeeDocuments]);
  useEffect(() => writeArray(PROFILE_REQUEST_KEY, profileRequests), [profileRequests]);
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
    if (Array.isArray(cloudLeavePolicies)) setLeavePolicies(cloudLeavePolicies);
  }, [cloudLeavePolicies]);
  useEffect(() => {
    if (Array.isArray(cloudHolidays)) setHolidays(cloudHolidays);
  }, [cloudHolidays]);
  useEffect(() => {
    if (Array.isArray(cloudSalaryHistory)) setSalaryHistory(cloudSalaryHistory);
  }, [cloudSalaryHistory]);
  useEffect(() => {
    if (Array.isArray(cloudPayslips)) setPayslips(cloudPayslips);
  }, [cloudPayslips]);
  useEffect(() => {
    if (Array.isArray(cloudEmployeeDocuments)) setEmployeeDocuments(cloudEmployeeDocuments);
  }, [cloudEmployeeDocuments]);
  useEffect(() => {
    if (Array.isArray(cloudProfileRequests)) setProfileRequests(cloudProfileRequests);
  }, [cloudProfileRequests]);
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
  }, [orders, employees, attendance, leaveBalances, leaveRequests, leavePolicies, holidays, salaryHistory, payslips, employeeDocuments, auditLogs, payments, offlineQueue, subscription, security, devices]);

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
  const selectedEmployeeSalaryHistory = useMemo(
    () => selectedEmployee
      ? salaryHistory
        .filter((record) => record.employeeId === selectedEmployee.id)
        .sort((a, b) => String(b.effectiveFrom || b.effective_from || '').localeCompare(String(a.effectiveFrom || a.effective_from || '')))
      : [],
    [salaryHistory, selectedEmployee]
  );
  const selectedEmployeePayslips = useMemo(
    () => selectedEmployee
      ? payslips
        .filter((record) => record.employeeId === selectedEmployee.id)
        .sort((a, b) => String(b.salaryMonth || b.salary_month || '').localeCompare(String(a.salaryMonth || a.salary_month || '')))
      : [],
    [payslips, selectedEmployee]
  );
  const selectedEmployeeDocuments = useMemo(
    () => selectedEmployee
      ? employeeDocuments
        .filter((record) => record.employeeId === selectedEmployee.id)
        .filter((record) => documentCategoryFilter === 'All' || record.documentCategory === documentCategoryFilter)
        .sort((a, b) => String(b.uploadedAt || b.uploaded_at || b.createdAt || '').localeCompare(String(a.uploadedAt || a.uploaded_at || a.createdAt || '')))
      : [],
    [documentCategoryFilter, employeeDocuments, selectedEmployee]
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
      emergencyContact: sanitizeText(form.get('emergency_contact'), 100),
      emergency_contact: sanitizeText(form.get('emergency_contact'), 100),
      bankDetails: sanitizeText(form.get('bank_details'), 300),
      bank_details: sanitizeText(form.get('bank_details'), 300),
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
    const activePolicy = leavePolicies.find((p) => (p.leaveType === leaveType || p.leave_type === leaveType) && p.status === 'Active');
    const typeInfo = LEAVE_TYPES.find((type) => type.id === leaveType) || LEAVE_TYPES[0];
    const allocation = activePolicy ? Number(activePolicy.yearlyAllocation || activePolicy.yearly_allocation) : typeInfo.allocation;
    const balance = {
      id: `leave-bal-${employee.id}-${leaveType}`,
      employeeId: employee.id,
      employee_id: employeeIdentifier(employee),
      employeeName: employeeDisplayName(employee),
      leaveType,
      leave_type: leaveType,
      yearlyAllocation: allocation,
      yearly_allocation: allocation,
      usedLeaves: 0,
      used_leaves: 0,
      remainingLeaves: allocation,
      remaining_leaves: allocation,
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
  const exportAttendanceReport = async () => {
    const csvContent = [
      ['Employee Name', 'Date', 'In Time', 'Out Time', 'Hours', 'Status', 'Late Mark'],
      ...filteredAttendance.map(entry => [
        entry.name || employees.find((employee) => employee.id === entry.employeeId)?.name || 'Employee',
        entry.attendanceDate || entry.date,
        entry.inTime || entry.in_time || '--',
        entry.outTime || entry.out_time || '--',
        entry.workingHours ?? entry.working_hours ?? 0,
        entry.status,
        (entry.lateMark || entry.late_mark) ? 'Yes' : 'No'
      ])
    ].map(e => e.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Report_${attendanceMonthFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    await logAudit(`Exported attendance report for ${attendanceMonthFilter}`, 'Attendance Reports');
  };

  const saveLeavePolicy = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const current = editingLeavePolicy;
    const leaveType = form.get('leaveType');
    const policy = {
      ...(current || {}),
      id: current?.id || createId('lpol'),
      leaveType,
      leave_type: leaveType,
      yearlyAllocation: normalizeAmount(form.get('yearlyAllocation')),
      yearly_allocation: normalizeAmount(form.get('yearlyAllocation')),
      carryForwardAllowed: form.get('carryForwardAllowed') === 'on',
      carry_forward_allowed: form.get('carryForwardAllowed') === 'on',
      maxCarryForwardDays: normalizeAmount(form.get('maxCarryForwardDays')),
      max_carry_forward_days: normalizeAmount(form.get('maxCarryForwardDays')),
      encashmentAllowed: form.get('encashmentAllowed') === 'on',
      encashment_allowed: form.get('encashmentAllowed') === 'on',
      halfDayAllowed: form.get('halfDayAllowed') === 'on',
      half_day_allowed: form.get('halfDayAllowed') === 'on',
      negativeBalanceAllowed: form.get('negativeBalanceAllowed') === 'on',
      negative_balance_allowed: form.get('negativeBalanceAllowed') === 'on',
      approvalRequired: form.get('approvalRequired') === 'on',
      approval_required: form.get('approvalRequired') === 'on',
      excludeHolidays: form.get('excludeHolidays') === 'on',
      exclude_holidays: form.get('excludeHolidays') === 'on',
      excludeWeekends: form.get('excludeWeekends') === 'on',
      exclude_weekends: form.get('excludeWeekends') === 'on',
      effectiveFrom: form.get('effectiveFrom') || today(),
      effective_from: form.get('effectiveFrom') || today(),
      status: form.get('status') || 'Active',
      businessId: 'default',
      companyId: 'default',
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await persistRecord('leave_policies', policy, 'Leave policy save failed');
    } catch (error) {
      onStatus(error?.message || 'Leave policy save failed');
      return;
    }
    setLeavePolicies((items) => [policy, ...items.filter((item) => item.id !== policy.id)]);
    await logAudit(`${current ? 'leave policy updated' : 'leave policy created'}: ${leaveType}`, 'Leave Policies');
    if (current && current.status !== policy.status) {
      await logAudit(`leave policy status changed: ${leaveType} to ${policy.status}`, 'Leave Policies');
    }
    setEditingLeavePolicy(null);
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

  const saveSalaryRecord = async (event) => {
    event.preventDefault();
    if (!selectedEmployee) return;
    const form = new FormData(event.currentTarget);
    const current = editingSalaryRecord;
    const salaryType = SALARY_TYPES.includes(form.get('salaryType')) ? form.get('salaryType') : 'Monthly';
    const salaryRecord = {
      ...(current || {}),
      id: current?.id || createId('sal'),
      employeeId: selectedEmployee.id,
      employee_id: employeeIdentifier(selectedEmployee),
      employeeName: employeeDisplayName(selectedEmployee),
      businessId: current?.businessId || 'default',
      companyId: current?.companyId || 'default',
      effectiveFrom: form.get('effectiveFrom') || today(),
      effective_from: form.get('effectiveFrom') || today(),
      salaryAmount: normalizeAmount(form.get('salaryAmount')),
      salary_amount: normalizeAmount(form.get('salaryAmount')),
      status: current?.status || 'Draft',
      salaryType,
      salary_type: salaryType,
      incrementAmount: normalizeAmount(form.get('incrementAmount')),
      increment_amount: normalizeAmount(form.get('incrementAmount')),
      incrementReason: sanitizeText(form.get('incrementReason'), 260),
      increment_reason: sanitizeText(form.get('incrementReason'), 260),
      remarks: sanitizeText(form.get('remarks'), 400),
      createdBy: current?.createdBy || authUser?.email || authUser?.uid || '',
      created_by: current?.createdBy || authUser?.email || authUser?.uid || '',
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!salaryRecord.salaryAmount) {
      onStatus('Enter salary amount');
      return;
    }
    try {
      await persistRecord('salary_history', salaryRecord, 'Salary record save failed');
    } catch (error) {
      onStatus(error?.message || 'Salary record save failed');
      return;
    }
    setSalaryHistory((items) => [salaryRecord, ...items.filter((item) => item.id !== salaryRecord.id)]);
    await logAudit(`salary record ${current ? 'updated' : 'created'}: ${employeeDisplayName(selectedEmployee)}`, 'Salary');
    setEditingSalaryRecord(null);
    event.currentTarget.reset();
  };

  const savePayslip = async (event) => {
    event.preventDefault();
    if (!selectedEmployee) return;
    const form = new FormData(event.currentTarget);
    const current = editingPayslip;
    const file = form.get('payslipFile');
    let storagePath = current?.storagePath || current?.storage_path || '';
    let uploadedFileName = current?.fileName || current?.file_name || '';
    if (file?.size) {
      try {
        if (storagePath && onHrmsDocumentDelete) {
          await onHrmsDocumentDelete(storagePath).catch(() => false);
        }
        const upload = await onHrmsDocumentUpload?.({
          employeeId: selectedEmployee.id,
          businessId: current?.businessId || 'default',
          category: 'Payslips',
          file,
        });
        storagePath = upload?.path || storagePath;
        uploadedFileName = file.name;
      } catch (error) {
        onStatus(error?.message || 'Payslip upload failed');
        return;
      }
    }
    const basicSalary = normalizeAmount(form.get('basicSalary'));
    const allowances = normalizeAmount(form.get('allowances'));
    const deductions = normalizeAmount(form.get('deductions'));
    const status = current?.status || 'Draft';
    const payslip = {
      ...(current || {}),
      id: current?.id || createId('payroll'),
      employeeId: selectedEmployee.id,
      employee_id: employeeIdentifier(selectedEmployee),
      employeeName: employeeDisplayName(selectedEmployee),
      businessId: current?.businessId || 'default',
      companyId: current?.companyId || 'default',
      salaryMonth: form.get('salaryMonth') || monthKey(),
      salary_month: form.get('salaryMonth') || monthKey(),
      basicSalary,
      basic_salary: basicSalary,
      allowances,
      deductions,
      netSalary: Math.max(0, basicSalary + allowances - deductions),
      net_salary: Math.max(0, basicSalary + allowances - deductions),
      storagePath,
      storage_path: storagePath,
      generatedPayslipUrl: storagePath,
      generated_payslip_url: storagePath,
      fileName: uploadedFileName,
      file_name: uploadedFileName,
      status,
      createdBy: current?.createdBy || authUser?.email || authUser?.uid || '',
      created_by: current?.createdBy || authUser?.email || authUser?.uid || '',
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!payslip.basicSalary || !payslip.salaryMonth) {
      onStatus('Enter salary month and basic salary');
      return;
    }
    try {
      await persistRecord('payslips', payslip, 'Payslip save failed');
    } catch (error) {
      onStatus(error?.message || 'Payslip save failed');
      return;
    }
    setPayslips((items) => [payslip, ...items.filter((item) => item.id !== payslip.id)]);
    await logAudit(`payslip ${current ? (file?.size ? 'replaced' : 'updated') : 'generated'}: ${employeeDisplayName(selectedEmployee)} ${payslip.salaryMonth}`, 'Payslips');
    setEditingPayslip(null);
    event.currentTarget.reset();
  };

  const saveEmployeeDocument = async (event) => {
    event.preventDefault();
    if (!selectedEmployee) return;
    const form = new FormData(event.currentTarget);
    const current = editingEmployeeDocument;
    const file = form.get('documentFile');
    let storagePath = current?.storagePath || current?.storage_path || '';
    let fileType = current?.fileType || current?.file_type || '';
    let fileName = current?.fileName || current?.file_name || '';
    if (file?.size) {
      try {
        if (storagePath && onHrmsDocumentDelete) {
          await onHrmsDocumentDelete(storagePath).catch(() => false);
        }
        const upload = await onHrmsDocumentUpload?.({
          employeeId: selectedEmployee.id,
          businessId: current?.businessId || 'default',
          category: form.get('documentCategory') || 'Other Documents',
          file,
        });
        storagePath = upload?.path || storagePath;
        fileType = file.type || 'application/octet-stream';
        fileName = file.name;
      } catch (error) {
        onStatus(error?.message || 'Document upload failed');
        return;
      }
    }
    if (!storagePath) {
      onStatus('Choose a document file to upload');
      return;
    }
    const category = DOCUMENT_CATEGORIES.includes(form.get('documentCategory')) ? form.get('documentCategory') : 'Other Documents';
    const documentRecord = {
      ...(current || {}),
      id: current?.id || createId('doc'),
      employeeId: selectedEmployee.id,
      employee_id: employeeIdentifier(selectedEmployee),
      employeeName: employeeDisplayName(selectedEmployee),
      businessId: current?.businessId || 'default',
      companyId: current?.companyId || 'default',
      documentCategory: category,
      document_category: category,
      documentName: sanitizeText(form.get('documentName'), 160) || fileName,
      document_name: sanitizeText(form.get('documentName'), 160) || fileName,
      storagePath,
      storage_path: storagePath,
      fileType,
      file_type: fileType,
      fileName,
      file_name: fileName,
      uploadedBy: current?.uploadedBy || authUser?.email || authUser?.uid || '',
      uploaded_by: current?.uploadedBy || authUser?.email || authUser?.uid || '',
      uploadedAt: current?.uploadedAt || new Date().toISOString(),
      uploaded_at: current?.uploadedAt || new Date().toISOString(),
      notes: sanitizeText(form.get('notes'), 400),
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await persistRecord('employee_documents', documentRecord, 'Employee document save failed');
    } catch (error) {
      onStatus(error?.message || 'Employee document save failed');
      return;
    }
    setEmployeeDocuments((items) => [documentRecord, ...items.filter((item) => item.id !== documentRecord.id)]);
    await logAudit(`employee document ${current ? 'replaced' : 'uploaded'}: ${employeeDisplayName(selectedEmployee)} ${documentRecord.documentName}`, 'Documents');
    setEditingEmployeeDocument(null);
    event.currentTarget.reset();
  };

  const downloadHrmsFile = async (path) => {
    try {
      const url = await onHrmsDocumentUrl?.(path);
      if (!url) throw new Error('Secure document URL was not generated.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      onStatus(error?.message || 'Document download failed');
    }
  };

  const deletePayslip = async (payslip) => {
    const deleted = await deleteRecord('payslips', payslip.id, payslip.salaryMonth || 'payslip', setPayslips, async () => {
      if (editingPayslip?.id === payslip.id) setEditingPayslip(null);
    });
    if (deleted) {
      if (payslip.storagePath || payslip.storage_path) {
        await onHrmsDocumentDelete?.(payslip.storagePath || payslip.storage_path).catch(() => false);
      }
      await logAudit(`payslip deleted: ${payslip.employeeName || ''} ${payslip.salaryMonth || ''}`, 'Payslips');
    }
  };

  const submitForApproval = async (record, type) => {
    const table = type === 'salary' ? 'salary_history' : 'payslips';
    const setter = type === 'salary' ? setSalaryHistory : setPayslips;
    const moduleName = type === 'salary' ? 'Salary' : 'Payslips';
    const updated = { ...record, status: 'Pending Approval', updatedAt: new Date().toISOString() };
    try {
      await persistRecord(table, updated, `${moduleName} submit failed`);
      setter(items => [updated, ...items.filter(i => i.id !== record.id)]);
      await logAudit(`${type} submitted for approval: ${record.employeeName || record.id}`, moduleName);
      onStatus('Submitted for approval');
    } catch (err) {
      onStatus(err?.message || 'Action failed');
    }
  };

  const approveRecord = async (record, type) => {
    const table = type === 'salary' ? 'salary_history' : 'payslips';
    const setter = type === 'salary' ? setSalaryHistory : setPayslips;
    const moduleName = type === 'salary' ? 'Salary' : 'Payslips';
    const updated = { 
      ...record, 
      status: 'Approved', 
      approvedBy: authUser?.email || authUser?.uid || 'Unknown', 
      approved_by: authUser?.email || authUser?.uid || 'Unknown', 
      approvedAt: new Date().toISOString(), 
      approved_at: new Date().toISOString(), 
      updatedAt: new Date().toISOString() 
    };
    try {
      await persistRecord(table, updated, `${moduleName} approve failed`);
      setter(items => [updated, ...items.filter(i => i.id !== record.id)]);
      await logAudit(`${type} approved: ${record.employeeName || record.id}`, moduleName);
      onStatus('Approved successfully');
    } catch (err) {
      onStatus(err?.message || 'Action failed');
    }
  };

  const rejectRecord = async (record, type, reason) => {
    const table = type === 'salary' ? 'salary_history' : 'payslips';
    const setter = type === 'salary' ? setSalaryHistory : setPayslips;
    const moduleName = type === 'salary' ? 'Salary' : 'Payslips';
    const updated = { 
      ...record, 
      status: 'Rejected', 
      rejectionReason: reason, 
      rejection_reason: reason, 
      updatedAt: new Date().toISOString() 
    };
    try {
      await persistRecord(table, updated, `${moduleName} reject failed`);
      setter(items => [updated, ...items.filter(i => i.id !== record.id)]);
      await logAudit(`${type} rejected: ${record.employeeName || record.id}`, moduleName);
      onStatus('Rejected successfully');
    } catch (err) {
      onStatus(err?.message || 'Action failed');
    } finally {
      setRejectionModal(null);
    }
  };

  const markPaid = async (record, type) => {
    const table = type === 'salary' ? 'salary_history' : 'payslips';
    const setter = type === 'salary' ? setSalaryHistory : setPayslips;
    const moduleName = type === 'salary' ? 'Salary' : 'Payslips';
    const updated = { ...record, status: 'Paid', updatedAt: new Date().toISOString() };
    try {
      await persistRecord(table, updated, `${moduleName} mark paid failed`);
      setter(items => [updated, ...items.filter(i => i.id !== record.id)]);
      await logAudit(`${type} marked paid: ${record.employeeName || record.id}`, moduleName);
      onStatus('Marked as Paid');
    } catch (err) {
      onStatus(err?.message || 'Action failed');
    }
  };

  const submitProfileRequest = async (event) => {
    event.preventDefault();
    if (!authUser?.uid) return;
    const form = new FormData(event.currentTarget);
    const changes = {
      mobile_number: sanitizeText(form.get('mobile_number'), 24),
      email: String(form.get('email') || '').trim().toLowerCase(),
      address: sanitizeText(form.get('address'), 280),
      emergency_contact: sanitizeText(form.get('emergency_contact'), 100),
      bank_details: sanitizeText(form.get('bank_details'), 300),
    };
    const req = {
      id: createId('preq'),
      employee_id: selectedEmployee.id,
      requested_by: authUser.uid,
      changes,
      status: 'Pending',
      business_id: selectedEmployee.businessId || 'default',
      company_id: selectedEmployee.companyId || 'default',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      await persistRecord('employee_profile_requests', req, 'Profile request failed');
      setProfileRequests(items => [req, ...items]);
      await logAudit(`Profile update requested: ${employeeDisplayName(selectedEmployee)}`, 'Employees');
      onStatus('Profile update requested');
      setRequestUpdateModal(null);
    } catch (err) {
      onStatus(err?.message || 'Request failed');
    }
  };

  const approveProfileRequest = async (req) => {
    try {
      const updatedReq = { ...req, status: 'Approved', reviewed_by: authUser?.email, updated_at: new Date().toISOString() };
      await persistRecord('employee_profile_requests', updatedReq, 'Approval failed');
      
      const targetEmp = employees.find(e => e.id === req.employee_id || e.id === req.employeeId);
      if (targetEmp) {
        const empUpdates = { 
          ...targetEmp, 
          ...req.changes, 
          mobileNumber: req.changes.mobile_number || targetEmp.mobileNumber,
          emergencyContact: req.changes.emergency_contact || targetEmp.emergencyContact,
          bankDetails: req.changes.bank_details || targetEmp.bankDetails,
          updatedAt: new Date().toISOString() 
        };
        await persistRecord('employees', empUpdates, 'Employee update failed');
        setEmployees(items => [empUpdates, ...items.filter(i => i.id !== targetEmp.id)]);
      }

      setProfileRequests(items => [updatedReq, ...items.filter(i => i.id !== req.id)]);
      await logAudit(`Profile update approved: ${targetEmp ? employeeDisplayName(targetEmp) : req.employee_id}`, 'Employees');
      onStatus('Profile update approved');
    } catch (err) {
      onStatus(err?.message || 'Action failed');
    }
  };

  const rejectProfileRequest = async (req, reason) => {
    try {
      const updatedReq = { ...req, status: 'Rejected', rejection_reason: reason, reviewed_by: authUser?.email, updated_at: new Date().toISOString() };
      await persistRecord('employee_profile_requests', updatedReq, 'Rejection failed');
      setProfileRequests(items => [updatedReq, ...items.filter(i => i.id !== req.id)]);
      await logAudit(`Profile update rejected: ${req.employee_id}`, 'Employees');
      onStatus('Profile update rejected');
    } catch (err) {
      onStatus(err?.message || 'Action failed');
    }
  };

  const deleteEmployeeDocument = async (documentRecord) => {
    const deleted = await deleteRecord('employee_documents', documentRecord.id, documentRecord.documentName || 'document', setEmployeeDocuments, async () => {
      if (editingEmployeeDocument?.id === documentRecord.id) setEditingEmployeeDocument(null);
    });
    if (deleted) {
      await onHrmsDocumentDelete?.(documentRecord.storagePath || documentRecord.storage_path).catch(() => false);
      await logAudit(`employee document deleted: ${documentRecord.employeeName || ''} ${documentRecord.documentName || ''}`, 'Documents');
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
    const canManageSalary = ['owner', 'accountant'].includes(employeeRole);
    const canManageDocuments = ['owner'].includes(employeeRole);
    const isOwner = employeeRole === 'owner';
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

        {rejectionModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Reject {rejectionModal.type === 'profile_request' ? 'Profile Request' : rejectionModal.type === 'salary' ? 'Salary Record' : 'Payslip'}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (rejectionModal.type === 'profile_request') {
                  rejectProfileRequest(rejectionModal.record, new FormData(e.currentTarget).get('reason'));
                } else {
                  rejectRecord(rejectionModal.record, rejectionModal.type, new FormData(e.currentTarget).get('reason'));
                }
              }}>
                <textarea name="reason" placeholder="Reason for rejection" required rows={3} style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem' }} />
                <div className="voucher-actions">
                  <button className="delete-entry-button" type="submit">Confirm Reject</button>
                  <button className="secondary-button compact-button" type="button" onClick={() => setRejectionModal(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
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

        {requestUpdateModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
              <h3>Request Profile Update</h3>
              <p className="panel-hint" style={{ marginBottom: '1rem' }}>Your manager will review these changes before they are applied.</p>
              <form className="hrms-form-grid" onSubmit={submitProfileRequest}>
                <div>
                  <label className="field-label" htmlFor="mobile_number">Mobile Number</label>
                  <input id="mobile_number" name="mobile_number" defaultValue={employeeMobile(requestUpdateModal)} placeholder="+91 mobile number" required />
                </div>
                <div>
                  <label className="field-label" htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" defaultValue={requestUpdateModal.email || ''} placeholder="employee@example.com" />
                </div>
                <div className="wide-field">
                  <label className="field-label" htmlFor="address">Address</label>
                  <textarea id="address" name="address" defaultValue={requestUpdateModal.address || ''} placeholder="Employee address" />
                </div>
                <div className="wide-field">
                  <label className="field-label" htmlFor="emergency_contact">Emergency Contact</label>
                  <input id="emergency_contact" name="emergency_contact" defaultValue={requestUpdateModal.emergencyContact || requestUpdateModal.emergency_contact || ''} placeholder="Name & Phone" />
                </div>
                <div className="wide-field">
                  <label className="field-label" htmlFor="bank_details">Bank Details</label>
                  <textarea id="bank_details" name="bank_details" defaultValue={requestUpdateModal.bankDetails || requestUpdateModal.bank_details || ''} placeholder="Account No, IFSC, Bank Name" />
                </div>
                <div className="voucher-actions wide-field">
                  <button className="primary-button" type="submit">Submit Request</button>
                  <button className="secondary-button" type="button" onClick={() => setRequestUpdateModal(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {canManageEmployees && profileRequests.some(r => r.status === 'Pending') && (
          <section className="panel">
            <div className="section-header">
              <h2>Pending Profile Updates</h2>
              <span>Requires Approval</span>
            </div>
            <div className="hrms-record-grid">
              {profileRequests.filter(r => r.status === 'Pending').map(req => {
                const emp = employees.find(e => e.id === req.employee_id || e.id === req.employeeId);
                return (
                  <article className="hrms-mini-card" key={req.id}>
                    <strong>{emp ? employeeDisplayName(emp) : req.employee_id}</strong>
                    <p>Requested changes to personal info.</p>
                    <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', padding: '0.5rem', background: '#f9fafb', borderRadius: '4px', fontSize: '13px' }}>
                      {Object.entries(req.changes).map(([k, v]) => <div key={k}><b>{k}:</b> {v || '(empty)'}</div>)}
                    </div>
                    <div className="voucher-actions">
                      <button className="share-entry-button" type="button" onClick={() => approveProfileRequest(req)}>Approve</button>
                      <button className="delete-entry-button" type="button" onClick={() => setRejectionModal({ record: req, type: 'profile_request' })}>Reject</button>
                    </div>
                  </article>
                );
              })}
            </div>
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
                      {canManageEmployees && <button className="share-entry-button" type="button" onClick={() => { setLoginManageModal(employee); setLoginEmail(employee?.email || ''); setLoginPassword(''); setLoginStatusMsg({ text: '', type: '' }); }}>Manage Login</button>}
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

        {(canManageAttendance || canViewSalary) && (
          <section className="panel hrms-phaseb-panel">
            <div className="section-header">
              <div>
                <h2>Attendance Reports</h2>
                <p className="panel-hint">Monthly summaries, work hours, and export.</p>
              </div>
              <button className="manual-button" type="button" onClick={exportAttendanceReport}>Export CSV</button>
            </div>
            <div className="hrms-summary-grid">
              <div className="summary-card"><span>Total Present</span><strong>{attendanceSummary.present}</strong></div>
              <div className="summary-card"><span>Total Absent</span><strong>{attendanceSummary.absent}</strong></div>
              <div className="summary-card"><span>Total Late</span><strong>{attendanceSummary.late}</strong></div>
              <div className="summary-card"><span>Total Hours</span><strong>{filteredAttendance.reduce((sum, e) => sum + (Number(e.workingHours ?? e.working_hours) || 0), 0)}</strong></div>
            </div>
            <div className="hrms-table-container">
              <table className="hrms-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>In Time</th>
                    <th>Out Time</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.slice(0, 50).map(entry => (
                    <tr key={entry.id}>
                      <td>{entry.name || employees.find(e => e.id === entry.employeeId)?.name || 'Employee'}</td>
                      <td>{entry.attendanceDate || entry.date}</td>
                      <td>{entry.inTime || entry.in_time || '--'}</td>
                      <td>{entry.outTime || entry.out_time || '--'}</td>
                      <td>{entry.workingHours ?? entry.working_hours ?? 0}</td>
                      <td><span className={`attendance-pill ${entry.status === 'Absent' ? 'absent' : entry.status === 'Present' ? 'present' : ''}`}>{attendanceStatusLabel(entry.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

        {canManageLeave && (
          <section className="panel hrms-phaseb-panel">
            <div className="section-header">
              <div>
                <h2>Leave Policies</h2>
                <p className="panel-hint">Configure allocation, carry-forward, and encashment rules for leave types.</p>
              </div>
              <span>{leavePolicies.length} policies</span>
            </div>

            <form className="hrms-inline-form" onSubmit={saveLeavePolicy} key={editingLeavePolicy?.id || 'lpol-new'}>
              <select name="leaveType" defaultValue={editingLeavePolicy?.leaveType || editingLeavePolicy?.leave_type || 'SL'}>
                <option value="SL">Sick Leave (SL)</option>
                <option value="CL">Casual Leave (CL)</option>
                <option value="PL">Privilege Leave (PL)</option>
              </select>
              <input name="yearlyAllocation" type="number" min="0" defaultValue={editingLeavePolicy?.yearlyAllocation || editingLeavePolicy?.yearly_allocation || 0} placeholder="Yearly Allocation" required />
              <input name="maxCarryForwardDays" type="number" min="0" defaultValue={editingLeavePolicy?.maxCarryForwardDays || editingLeavePolicy?.max_carry_forward_days || 0} placeholder="Max Carry Forward" />
              <label className="hrms-check"><input name="carryForwardAllowed" type="checkbox" defaultChecked={Boolean(editingLeavePolicy?.carryForwardAllowed || editingLeavePolicy?.carry_forward_allowed)} /> Carry</label>
              <label className="hrms-check"><input name="encashmentAllowed" type="checkbox" defaultChecked={Boolean(editingLeavePolicy?.encashmentAllowed || editingLeavePolicy?.encashment_allowed)} /> Encash</label>
              <label className="hrms-check"><input name="halfDayAllowed" type="checkbox" defaultChecked={Boolean(editingLeavePolicy?.halfDayAllowed || editingLeavePolicy?.half_day_allowed)} /> Half Day</label>
              <label className="hrms-check"><input name="negativeBalanceAllowed" type="checkbox" defaultChecked={Boolean(editingLeavePolicy?.negativeBalanceAllowed || editingLeavePolicy?.negative_balance_allowed)} /> Negative</label>
              <select name="status" defaultValue={editingLeavePolicy?.status || 'Active'}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button className="manual-button" type="submit">{editingLeavePolicy ? 'Update' : 'Save'}</button>
              {editingLeavePolicy && <button className="secondary-button compact-button" type="button" onClick={() => setEditingLeavePolicy(null)}>Cancel</button>}
            </form>

            <div className="hrms-record-grid">
              {leavePolicies.length === 0 ? <div className="empty-state">No leave policies defined.</div> : leavePolicies.map((policy) => (
                <article className="hrms-mini-card" key={policy.id}>
                  <div>
                    <strong>{policy.leaveType || policy.leave_type}</strong>
                    <p>{policy.yearlyAllocation || policy.yearly_allocation} days/year · {policy.status}</p>
                    <p>Carry: {(policy.carryForwardAllowed || policy.carry_forward_allowed) ? `Yes (Max: ${policy.maxCarryForwardDays || policy.max_carry_forward_days})` : 'No'} · Encash: {(policy.encashmentAllowed || policy.encashment_allowed) ? 'Yes' : 'No'}</p>
                  </div>
                  <span className={`hrms-status ${(policy.status || 'Active').toLowerCase()}`}>{policy.status}</span>
                  <div className="voucher-actions">
                    <button className="share-entry-button" type="button" onClick={() => setEditingLeavePolicy(policy)}>Edit</button>
                  </div>
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
              {EMPLOYEE_PROFILE_TABS.map((tab) => {
                if (tab === 'Login & Access' && !canManageEmployees) return null;
                return (
                  <button className={employeeProfileTab === tab ? 'active' : ''} key={tab} type="button" onClick={() => {
                    setEmployeeProfileTab(tab);
                    setLoginStatusMsg({ text: '', type: '' });
                    setLoginEmail(selectedEmployee?.email || '');
                    setLoginPassword('');
                  }}>
                    {tab}
                  </button>
                );
              })}
            </div>
            <div className="hrms-tab-card">
              {employeeProfileTab === 'Personal Information' && (
                <div style={{ position: 'relative' }}>
                  {staffEmployeeIds.has(selectedEmployee.id) && (
                    <button className="primary-button" style={{ position: 'absolute', top: '-3rem', right: '0' }} onClick={() => setRequestUpdateModal(selectedEmployee)}>Request Update</button>
                  )}
                  <dl className="hrms-detail-grid">
                    <div><dt>Full Name</dt><dd>{employeeDisplayName(selectedEmployee)}</dd></div>
                    <div><dt>Mobile</dt><dd>{employeeMobile(selectedEmployee) || 'Not added'}</dd></div>
                    <div><dt>Email</dt><dd>{selectedEmployee.email || 'Not added'}</dd></div>
                    <div><dt>Address</dt><dd>{selectedEmployee.address || 'Not added'}</dd></div>
                    <div><dt>Emergency Contact</dt><dd>{selectedEmployee.emergencyContact || selectedEmployee.emergency_contact || 'Not added'}</dd></div>
                    <div style={{ gridColumn: '1 / -1' }}><dt>Bank Details</dt><dd>{selectedEmployee.bankDetails || selectedEmployee.bank_details || 'Not added'}</dd></div>
                  </dl>
                </div>
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
                <div className="hrms-phasec-stack">
                  {!canViewSalary ? (
                    <div className="empty-state">Salary information is restricted for your role.</div>
                  ) : (
                    <>
                      {canManageSalary && (
                        <form className="hrms-inline-form" onSubmit={saveSalaryRecord} key={editingSalaryRecord?.id || 'salary-new'}>
                          <input name="effectiveFrom" type="date" defaultValue={editingSalaryRecord?.effectiveFrom || editingSalaryRecord?.effective_from || today()} required />
                          <input name="salaryAmount" type="number" min="0" defaultValue={editingSalaryRecord?.salaryAmount ?? editingSalaryRecord?.salary_amount ?? selectedEmployee.salary ?? ''} placeholder="Salary amount" required />
                          <select name="salaryType" defaultValue={editingSalaryRecord?.salaryType || editingSalaryRecord?.salary_type || 'Monthly'}>
                            {SALARY_TYPES.map((type) => <option key={type}>{type}</option>)}
                          </select>
                          <input name="incrementAmount" type="number" min="0" defaultValue={editingSalaryRecord?.incrementAmount ?? editingSalaryRecord?.increment_amount ?? ''} placeholder="Increment" />
                          <input name="incrementReason" defaultValue={editingSalaryRecord?.incrementReason || editingSalaryRecord?.increment_reason || ''} placeholder="Increment reason" />
                          <input name="remarks" defaultValue={editingSalaryRecord?.remarks || ''} placeholder="Remarks" />
                          <button className="manual-button" type="submit">{editingSalaryRecord ? 'Update Salary' : 'Add Salary'}</button>
                          {editingSalaryRecord && <button className="secondary-button compact-button" type="button" onClick={() => setEditingSalaryRecord(null)}>Cancel</button>}
                        </form>
                      )}
                      <div className="hrms-record-grid">
                        {selectedEmployeeSalaryHistory.length === 0 ? <div className="empty-state">No salary history records yet.</div> : selectedEmployeeSalaryHistory.map((record) => (
                          <article className="hrms-mini-card" key={record.id}>
                            <strong>{formatCurrency(record.salaryAmount ?? record.salary_amount)}</strong>
                            <p>{record.salaryType || record.salary_type} · Effective {record.effectiveFrom || record.effective_from}</p>
                            <span className={`hrms-status ${(record.status || 'Draft').toLowerCase().replace(' ', '-')}`}>{record.status || 'Draft'}</span>
                            <p>{record.incrementReason || record.increment_reason || record.remarks || 'No increment note'}</p>
                            {record.status === 'Rejected' && <p style={{ color: '#d32f2f', fontSize: '0.8rem' }}>Reason: {record.rejectionReason || record.rejection_reason}</p>}
                            <div className="voucher-actions">
                              {(record.status === 'Draft' || record.status === 'Rejected') && canManageSalary && <button className="share-entry-button" type="button" onClick={() => submitForApproval(record, 'salary')}>Submit</button>}
                              {record.status === 'Pending Approval' && canManageSalary && isOwner && <button className="share-entry-button" type="button" onClick={() => approveRecord(record, 'salary')}>Approve</button>}
                              {record.status === 'Pending Approval' && canManageSalary && isOwner && <button className="delete-entry-button" type="button" onClick={() => setRejectionModal({ record, type: 'salary' })}>Reject</button>}
                              {record.status === 'Approved' && canManageSalary && <button className="share-entry-button" type="button" onClick={() => markPaid(record, 'salary')}>Mark Paid</button>}
                              {canManageSalary && <button className="share-entry-button" type="button" onClick={() => setEditingSalaryRecord(record)}>Edit</button>}
                              {canManageSalary && <button className="delete-entry-button" type="button" onClick={() => deleteSalaryRecord(record)}>Delete</button>}
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className="section-header hrms-subsection-header">
                        <div>
                          <h3>Payslips</h3>
                          <p className="panel-hint">Generate or upload private payslip records for this employee.</p>
                        </div>
                      </div>
                      {canManageSalary && (
                        <form className="hrms-inline-form" onSubmit={savePayslip} key={editingPayslip?.id || 'payslip-new'}>
                          <input name="salaryMonth" type="month" defaultValue={editingPayslip?.salaryMonth || editingPayslip?.salary_month || monthKey()} required />
                          <input name="basicSalary" type="number" min="0" defaultValue={editingPayslip?.basicSalary ?? editingPayslip?.basic_salary ?? selectedEmployee.salary ?? ''} placeholder="Basic salary" required />
                          <input name="allowances" type="number" min="0" defaultValue={editingPayslip?.allowances ?? ''} placeholder="Allowances" />
                          <input name="deductions" type="number" min="0" defaultValue={editingPayslip?.deductions ?? ''} placeholder="Deductions" />
                          <input name="payslipFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                          <button className="manual-button" type="submit">{editingPayslip ? 'Update Payslip' : 'Generate Payslip'}</button>
                          {editingPayslip && <button className="secondary-button compact-button" type="button" onClick={() => setEditingPayslip(null)}>Cancel</button>}
                        </form>
                      )}
                      <div className="hrms-record-grid">
                        {selectedEmployeePayslips.length === 0 ? <div className="empty-state">No payslips yet.</div> : selectedEmployeePayslips.map((payslip) => (
                          <article className="hrms-mini-card" key={payslip.id}>
                            <strong>{payslip.salaryMonth || payslip.salary_month}</strong>
                            <p>Net salary: {formatCurrency(payslip.netSalary ?? payslip.net_salary)}</p>
                            <span className={`hrms-status ${(payslip.status || 'Draft').toLowerCase().replace(' ', '-')}`}>{payslip.status || 'Draft'}</span>
                            {payslip.status === 'Rejected' && <p style={{ color: '#d32f2f', fontSize: '0.8rem' }}>Reason: {payslip.rejectionReason || payslip.rejection_reason}</p>}
                            <div className="voucher-actions">
                              {(payslip.status === 'Draft' || payslip.status === 'Rejected') && canManageSalary && <button className="share-entry-button" type="button" onClick={() => submitForApproval(payslip, 'payslip')}>Submit</button>}
                              {payslip.status === 'Pending Approval' && canManageSalary && isOwner && <button className="share-entry-button" type="button" onClick={() => approveRecord(payslip, 'payslip')}>Approve</button>}
                              {payslip.status === 'Pending Approval' && canManageSalary && isOwner && <button className="delete-entry-button" type="button" onClick={() => setRejectionModal({ record: payslip, type: 'payslip' })}>Reject</button>}
                              {payslip.status === 'Approved' && canManageSalary && <button className="share-entry-button" type="button" onClick={() => markPaid(payslip, 'payslip')}>Mark Paid</button>}
                              {(payslip.storagePath || payslip.storage_path) && <button className="share-entry-button" type="button" onClick={() => downloadHrmsFile(payslip.storagePath || payslip.storage_path)}>Download</button>}
                              {canManageSalary && <button className="share-entry-button" type="button" onClick={() => generatePayslipPdf(payslip, selectedEmployee)} disabled={generatingPayslipId === payslip.id}>{generatingPayslipId === payslip.id ? 'Generating...' : (payslip.storagePath || payslip.storage_path ? 'Regenerate PDF' : 'Generate PDF')}</button>}
                              {canManageSalary && <button className="share-entry-button" type="button" onClick={() => setEditingPayslip(payslip)}>Edit</button>}
                              {canManageSalary && <button className="delete-entry-button" type="button" onClick={() => deletePayslip(payslip)}>Delete</button>}
                            </div>
                          </article>
                        ))}
                      </div>
                    </>
                  )}
                </div>
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
              {employeeProfileTab === 'Documents' && (
                <div className="hrms-phasec-stack">
                  {canManageDocuments && (
                    <form className="hrms-inline-form" onSubmit={saveEmployeeDocument} key={editingEmployeeDocument?.id || 'document-new'}>
                      <select name="documentCategory" defaultValue={editingEmployeeDocument?.documentCategory || editingEmployeeDocument?.document_category || 'Other Documents'}>
                        {DOCUMENT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                      </select>
                      <input name="documentName" defaultValue={editingEmployeeDocument?.documentName || editingEmployeeDocument?.document_name || ''} placeholder="Document name" />
                      <input name="documentFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                      <input name="notes" defaultValue={editingEmployeeDocument?.notes || ''} placeholder="Notes" />
                      <button className="manual-button" type="submit">{editingEmployeeDocument ? 'Replace Document' : 'Upload Document'}</button>
                      {editingEmployeeDocument && <button className="secondary-button compact-button" type="button" onClick={() => setEditingEmployeeDocument(null)}>Cancel</button>}
                    </form>
                  )}
                  <div className="hrms-toolbar">
                    <select value={documentCategoryFilter} onChange={(event) => setDocumentCategoryFilter(event.target.value)}>
                      <option>All</option>
                      {DOCUMENT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </div>
                  <div className="hrms-record-grid">
                    {selectedEmployeeDocuments.length === 0 ? <div className="empty-state">No employee documents uploaded yet.</div> : selectedEmployeeDocuments.map((documentRecord) => (
                      <article className="hrms-mini-card" key={documentRecord.id}>
                        <strong>{documentRecord.documentName || documentRecord.document_name}</strong>
                        <p>{documentRecord.documentCategory || documentRecord.document_category} · {documentRecord.fileName || documentRecord.file_name || 'Stored file'}</p>
                        <p>{documentRecord.notes || 'No notes'}</p>
                        <div className="voucher-actions">
                          <button className="share-entry-button" type="button" onClick={() => downloadHrmsFile(documentRecord.storagePath || documentRecord.storage_path)}>Download</button>
                          {canManageDocuments && <button className="share-entry-button" type="button" onClick={() => setEditingEmployeeDocument(documentRecord)}>Replace</button>}
                          {canManageDocuments && <button className="delete-entry-button" type="button" onClick={() => deleteEmployeeDocument(documentRecord)}>Delete</button>}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
              {employeeProfileTab === 'Notes / Description' && (
                <article className="hrms-notes-card">
                  <strong>Description / Notes</strong>
                  <p>{selectedEmployee.notes || selectedEmployee.description || 'No notes added yet.'}</p>
                </article>
              )}

              {employeeProfileTab === 'Login & Access' && canManageEmployees && (
                <article className="hrms-notes-card">
                  <strong>Login & Access Management</strong>
                  <p className="panel-hint" style={{ marginBottom: '1rem' }}>Manage self-service login credentials for this employee. No email invitation required.</p>
                  
                  {loginStatusMsg.text && (
                    <div className={`toast-message ${loginStatusMsg.type}`} style={{ marginBottom: '1rem' }}>
                      {loginStatusMsg.text}
                    </div>
                  )}

                  <div className="hrms-grid">
                    <div className="hrms-form-group">
                      <label>Employee Login Email</label>
                      <input 
                        type="email" 
                        value={loginEmail} 
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. emp@company.com" 
                        autoComplete="off"
                      />
                    </div>
                    <div className="hrms-form-group">
                      <label>Temporary Password</label>
                      <input 
                        type="text" 
                        value={loginPassword} 
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Min 6 characters" 
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button className="manual-button" type="button" onClick={async () => {
                      if (!loginEmail || !loginPassword || loginPassword.length < 6) {
                        setLoginStatusMsg({ text: 'Please provide valid email and at least 6 char password.', type: 'error' });
                        return;
                      }
                      setLoginStatusMsg({ text: 'Creating login...', type: 'info' });
                      const { error } = await createEmployeeLogin(loginEmail, loginPassword, selectedEmployee.id, profile?.businessId);
                      if (error) {
                        setLoginStatusMsg({ text: 'Error: ' + error.message, type: 'error' });
                      } else {
                        setLoginStatusMsg({ text: 'Login created successfully!', type: 'success' });
                        setLoginPassword('');
                      }
                    }}>Create Login</button>
                    
                    <button className="secondary-button" type="button" onClick={async () => {
                      if (!loginPassword || loginPassword.length < 6) {
                        setLoginStatusMsg({ text: 'Please provide at least 6 char new password to reset.', type: 'error' });
                        return;
                      }
                      setLoginStatusMsg({ text: 'Resetting password...', type: 'info' });
                      const { error } = await resetEmployeePassword(selectedEmployee.id, profile?.businessId, loginPassword);
                      if (error) {
                        setLoginStatusMsg({ text: 'Error: ' + error.message, type: 'error' });
                      } else {
                        setLoginStatusMsg({ text: 'Password reset successfully!', type: 'success' });
                        setLoginPassword('');
                      }
                    }}>Reset Password</button>

                    <button className="secondary-button" type="button" style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={async () => {
                      if (confirm('Are you sure you want to disable login access for this employee?')) {
                        setLoginStatusMsg({ text: 'Disabling login...', type: 'info' });
                        const { error } = await disableEmployeeLogin(selectedEmployee.id, profile?.businessId);
                        if (error) {
                          setLoginStatusMsg({ text: 'Error: ' + error.message, type: 'error' });
                        } else {
                          setLoginStatusMsg({ text: 'Login disabled.', type: 'success' });
                        }
                      }
                    }}>Disable Login</button>
                  </div>
                </article>
              )}
            </div>
          </section>
        )}

      {loginManageModal && (
        <div className="hrms-modal-overlay">
          <div className="hrms-modal-content" style={{ maxWidth: '600px' }}>
            <div className="hrms-modal-header">
              <h2>Manage Login Access: {loginManageModal.name}</h2>
              <button className="close-button" type="button" onClick={() => setLoginManageModal(null)}>×</button>
            </div>
            <div className="hrms-modal-body">
              <p className="panel-hint" style={{ marginBottom: '1rem' }}>Manage self-service login credentials for this employee. No email invitation required.</p>
              
              {loginStatusMsg.text && (
                <div className={`toast-message ${loginStatusMsg.type}`} style={{ marginBottom: '1rem' }}>
                  {loginStatusMsg.text}
                </div>
              )}

              <div className="hrms-grid">
                <div className="hrms-form-group">
                  <label>Employee Login Email</label>
                  <input 
                    type="email" 
                    value={loginEmail} 
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. emp@company.com" 
                    autoComplete="off"
                  />
                </div>
                <div className="hrms-form-group">
                  <label>Temporary Password</label>
                  <input 
                    type="text" 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Min 6 characters" 
                    autoComplete="off"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <button className="manual-button" type="button" onClick={async () => {
                  if (!loginEmail || !loginPassword || loginPassword.length < 6) {
                    setLoginStatusMsg({ text: 'Please provide valid email and at least 6 char password.', type: 'error' });
                    return;
                  }
                  setLoginStatusMsg({ text: 'Creating login...', type: 'info' });
                  const { error } = await createEmployeeLogin(loginEmail, loginPassword, loginManageModal.id, profile?.businessId);
                  if (error) {
                    setLoginStatusMsg({ text: 'Error: ' + error.message, type: 'error' });
                  } else {
                    setLoginStatusMsg({ text: 'Login created successfully!', type: 'success' });
                    setLoginPassword('');
                  }
                }}>Create Login</button>
                
                <button className="secondary-button" type="button" onClick={async () => {
                  if (!loginPassword || loginPassword.length < 6) {
                    setLoginStatusMsg({ text: 'Please provide at least 6 char new password to reset.', type: 'error' });
                    return;
                  }
                  setLoginStatusMsg({ text: 'Resetting password...', type: 'info' });
                  const { error } = await resetEmployeePassword(loginManageModal.id, profile?.businessId, loginPassword);
                  if (error) {
                    setLoginStatusMsg({ text: 'Error: ' + error.message, type: 'error' });
                  } else {
                    setLoginStatusMsg({ text: 'Password reset successfully!', type: 'success' });
                    setLoginPassword('');
                  }
                }}>Reset Password</button>

                <button className="secondary-button" type="button" style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={async () => {
                  if (confirm('Are you sure you want to disable login access for this employee?')) {
                    setLoginStatusMsg({ text: 'Disabling login...', type: 'info' });
                    const { error } = await disableEmployeeLogin(loginManageModal.id, profile?.businessId);
                    if (error) {
                      setLoginStatusMsg({ text: 'Error: ' + error.message, type: 'error' });
                    } else {
                      setLoginStatusMsg({ text: 'Login disabled.', type: 'success' });
                    }
                  }
                }}>Disable Login</button>
              </div>
            </div>
          </div>
        </div>
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


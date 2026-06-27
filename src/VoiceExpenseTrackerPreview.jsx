import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Activity, ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, 
  TrendingUp, Users, Package, FileText, Bell, CheckSquare, 
  Clock, Plus, ShoppingBag, Truck, Search, Settings, HelpCircle, 
  LogOut, User, ChevronDown, Calendar, Lightbulb, CheckCircle, AlertCircle,
  CalendarDays, Gift, Briefcase, MapPin, Star, Sparkles, TrendingDown, Sun, Cloud,
  Filter, Tag, Download, Phone, Mail, MessageCircle, MoreHorizontal, Paperclip, Edit3, ArrowLeft, Image as ImageIcon
} from 'lucide-react';
import {
  LEDGERS_KEY,
  VOUCHERS_KEY,
  addPartyLedger,
  buildCreditPurchaseLines,
  buildCreditSaleLines,
  buildPaymentLines,
  buildReceiptLines,
  computeLedgerBalance,
  createVoucher,
  deleteVoucher,
  downloadCsv,
  ensureDefaultLedgers,
  getBusinessSuggestions,
  getCashLedgers,
  getExpenseLedgers,
  getLedgerById,
  getLedgerStatement,
  getPartyLedgers,
  getPartyOutstanding,
  migrateLogsToVouchers,
  readLedgers,
  readSavedArray,
  readVouchers,
  restoreBackupData,
  saveVoucher,
  voucherCashTotals,
  voucherToCsvRows,
  getDailyAndMonthlyStats,
  getPartySummary,
} from './accounting';
import { generateSampleData } from './sampleData.js';
import { OnboardingChecklist } from './OnboardingChecklist.jsx';
import { GuidedTour } from './GuidedTour.jsx';
import { SetupWizard } from './SetupWizard.jsx';
import { LegalPage, LEGAL_PAGE_IDS } from './LegalPages.jsx';
import {
  createInvoiceWithStock,
  buildHrmsStoragePath,
  createHrmsDocumentSignedUrl,
  createSupabaseAccount,
  deleteCloudRecord,
  deleteHrmsDocument,
  deletePaymentWithLedgerReversal,
  editPaymentWithLedgerReversal,
  getSupabaseUrl,
  getSupabaseAuthErrorMessage,
  getSupabaseProjectHost,
  inviteCompanyMember,
  isSupabaseConfigured,
  isPasswordRecoveryRoute,
  linkEmployeeUserMapping,
  logEmployeeSelfServiceEvent,
  listenToSupabaseAuth,
  loadCloudCollection,
  loadCompanyMembers,
  loadCurrentEmployeeMapping,
  loadEmployeeUserMappings,
  loadUserProfileSettings,
  postPaymentWithLedger,
  prepareSupabasePasswordRecoverySession,
  reloadCurrentSupabaseUser,
  runSupabaseDebugTest,
  saveCloudRecord,
  saveEmployeeSelfServiceRecord,
  saveUserProfile,
  saveUserProfileSettings,
  sendCurrentUserEmailVerification,
  sendSupabasePasswordReset,
  signInSupabaseAccount,
  signInSupabaseGoogle,
  signOutSupabase,
  updateCurrentUserPassword,
  updateCompanyMember,
  uploadHrmsDocument,
  removeCompanyMember,
  employeeChangePassword,
} from './supabaseClient.js';
import {
  canRunRateLimitedAction,
  normalizeAmount,
  publicSafeError,
  sanitizeEmail,
  sanitizeText,
  validateEmail,
  validatePassword,
  validatePhone,
  validateVoicePayload,
} from './security.js';
import {
  clearStorageScope,
  readScopedString,
  removeScopedValue,
  setStorageScope,
  writeScopedString,
} from './storageScope.js';
import { mapVoiceTypeToAccounting, parseReliableVoiceCommand } from './voiceParser.js';

const Phase2ERP = lazy(() => import('./Phase2ERP.jsx'));
const Phase3Ops = lazy(() => import('./Phase3Ops.jsx'));

const STORAGE_KEY = 'businessLogs';
const PROFILE_KEY = 'businessProfile';
const AUTH_KEY = 'voiceBusinessTrackerAuth';
const INVENTORY_KEY = 'businessInventory';
const ORDERS_KEY = 'businessOrders';
const VOICE_ALERTS_KEY = 'voiceLowStockAlertsEnabled';
const DEFAULT_PROFILE = {
  name: 'Trinetr Business Suite',
  tagline: 'Cash book and party khata for small business',
  logo: '/assets/trinetr-logo.jpg',
  owner: 'Business Owner',
  email: 'trinetr1901@gmail.com',
  phone: '+918488943771',
  address: '',
  gstin: '',
};
const SUPPORT_EMAIL = 'trinetr1901@gmail.com';
const SUPPORT_PHONE = '+918488943771';
const ALLOW_DEMO_AUTH = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH !== 'false';
const REQUIRE_VERIFIED_EMAIL = import.meta.env.PROD;
const SHOULD_DEBUG_DATABASE = import.meta.env.DEV || import.meta.env.VITE_DEBUG_DATABASE === 'true';

function debugInfo(...args) {
  if (SHOULD_DEBUG_DATABASE) {
    console.info(...args);
  }
}

function debugError(...args) {
  if (SHOULD_DEBUG_DATABASE) {
    console.error(...args);
  }
}

const FEATURE_CARDS = [
  ['Voice Transactions', 'Add expenses, sales, customers, and inventory using natural commands.'],
  ['Expense Tracking', 'Capture daily expenses instantly with categories and notes.'],
  ['Income Tracking', 'Record cash sales, credit sales, and customer receipts.'],
  ['Inventory Management', 'Track stock levels, purchase price, selling price, and alerts.'],
  ['Customer Management', 'Maintain customer records, dues, reminders, and statements.'],
  ['Reports & Analytics', 'Visual insights for revenue, expense, profit, GST, and growth.'],
];
const COMMAND_EXAMPLES = [
  'Add ₹500 expense for groceries',
  'Record ₹2,000 sale from customer Raj',
  'Add customer Rahul owes ₹1000',
  'Add 10 units of product Rice',
  "Show today's sales",
];

const CASH_LEDGER_ID = 'ledger-cash';
const SALES_LEDGER_ID = 'ledger-sales';
const MATERIAL_LEDGER_ID = 'ledger-material';
const DEFAULT_EXPENSE_LEDGER_ID = 'ledger-misc-expense';
const APP_TABS = [
  'dashboard',
  'company-setup',
  'masters',
  'vouchers-hub',
  'accounting-ledgers',
  'reports-hub',
  'ai-assistant',
  'inventory',
  'invoices',
  'gst',
  'crm',
  'suppliers',
  'businesses',
  'cloud-backup',
  'notifications',
  'analytics',
  'mobile-app',
  'whatsapp-automation',
  'upi-payments',
  'orders',
  'voice-bookkeeper',
  'employees',
  'subscriptions',
  'accountant-portal',
  'security-center',
  'user-management',
  'voucher-entry',
  'party-management',
  'reports',
  'day-book',
  'party-statement',
  'profile-settings',
  'app-settings',
  'database-test',
  'support',
  ...LEGAL_PAGE_IDS,
];
const navigationConfig = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '⌂',
    children: [
      { id: 'dashboard', path: '#dashboard', tab: 'dashboard', label: 'Dashboard', icon: '⌂' },
      { id: 'ai-insights', path: '#ai-assistant', tab: 'ai-assistant', label: 'AI Assistant', icon: '✣' },
      { id: 'analytics', path: '#analytics', tab: 'analytics', label: 'Analytics', icon: '⌁' },
      { id: 'notifications', path: '#notifications', tab: 'notifications', label: 'Notifications', icon: '◌' },
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    icon: '◇',
    children: [
      { id: 'company-setup', path: '#company-setup', tab: 'company-setup', label: 'Company Setup', icon: '▦' },
      { id: 'businesses', path: '#businesses', tab: 'businesses', label: 'Businesses / Branches', icon: '⌖' },
      { id: 'masters', path: '#masters', tab: 'masters', label: 'Masters', icon: '◈' },
    ],
  },
  {
    id: 'daily-work',
    label: 'Daily Work',
    icon: '▦',
    children: [
      { id: 'voucher-entry', path: '#voucher-entry', tab: 'voucher-entry', label: 'Voucher Entry', icon: '▣' },
      { id: 'invoices', path: '#invoices', tab: 'invoices', label: 'Invoices', icon: '▧' },
      { id: 'payments', path: '#upi-payments', tab: 'upi-payments', label: 'Payments / UPI', icon: '▥' },
      { id: 'day-book', path: '#day-book', tab: 'day-book', label: 'Day Book', icon: '☷' },
    ],
  },
  {
    id: 'inventory-work',
    label: 'Inventory & Orders',
    icon: '⬢',
    children: [
      { id: 'inventory', path: '#inventory', tab: 'inventory', label: 'Inventory', icon: '⬢' },
      { id: 'orders', path: '#orders', tab: 'orders', label: 'Orders', icon: '▤' },
      { id: 'gst', path: '#gst', tab: 'gst', label: 'GST Center', icon: '◇' },
    ],
  },
  {
    id: 'people-ledger',
    label: 'People & Ledger',
    icon: '◉',
    children: [
      { id: 'customers', path: '#crm', tab: 'crm', label: 'Customers', icon: '☉' },
      { id: 'suppliers', path: '#suppliers', tab: 'suppliers', label: 'Suppliers', icon: '◎' },
      { id: 'employees', path: '#employees', tab: 'employees', label: 'Employees', icon: '♙' },
      { id: 'party-management', path: '#party-management', tab: 'party-management', label: 'Party Management', icon: '▣' },
      { id: 'ledger', path: '#party-statement', tab: 'party-statement', label: 'Party Ledger', icon: '▤' },
    ],
  },
  {
    id: 'reports-accounting',
    label: 'Reports & Accounting',
    icon: '▱',
    children: [
      { id: 'reports', path: '#reports', tab: 'reports', label: 'Reports', icon: '▱' },
      { id: 'reports-hub', path: '#reports-hub', tab: 'reports-hub', label: 'Advanced Reports', icon: '⌁' },
      { id: 'accounting', path: '#accounting-ledgers', tab: 'accounting-ledgers', label: 'Accounting Ledgers', icon: '▤' },
      { id: 'vouchers-hub', path: '#vouchers-hub', tab: 'vouchers-hub', label: 'Voucher Types', icon: '▦' },
    ],
  },
  {
    id: 'automation-admin',
    label: 'Automation & Admin',
    icon: '⚡',
    children: [
      { id: 'voice-bookkeeper', path: '#voice-bookkeeper', tab: 'voice-bookkeeper', label: 'Voice Bookkeeper', icon: '✣' },
      { id: 'whatsapp-automation', path: '#whatsapp-automation', tab: 'whatsapp-automation', label: 'WhatsApp Automation', icon: '⚡' },
      { id: 'cloud-backup', path: '#cloud-backup', tab: 'cloud-backup', label: 'Cloud Backup', icon: '⎇' },
      { id: 'security-center', path: '#security-center', tab: 'security-center', label: 'Security Center', icon: '◇' },
      { id: 'user-management', path: '#user-management', tab: 'user-management', label: 'Users & Roles', icon: '♙' },
      { id: 'profile-settings', path: '#profile-settings', tab: 'profile-settings', label: 'Profile', icon: '☉' },
      { id: 'system-settings', path: '#app-settings', tab: 'app-settings', label: 'Settings', icon: '⚙' },
      { id: 'database-test', path: '#database-test', tab: 'database-test', label: 'Database Test', icon: '◉', debugOnly: true },
    ],
  },
];
const SIDEBAR_SECTIONS = navigationConfig;
const EMPLOYEE_SELF_TABS = [
  ['dashboard', 'Dashboard'],
  ['profile', 'My Profile'],
  ['attendance', 'My Attendance'],
  ['leaves', 'My Leaves'],
  ['holidays', 'My Holidays'],
  ['salary', 'My Salary/Payslips'],
  ['documents', 'My Documents'],
];

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function readSavedLogs() {
  return readSavedArray(STORAGE_KEY);
}

function readProfile() {
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(readScopedString(PROFILE_KEY) || '{}') };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function sortVouchersNewestFirst(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const aTime = `${a.date || ''} ${a.dateTime || ''}`;
    const bTime = `${b.date || ''} ${b.dateTime || ''}`;
    return bTime.localeCompare(aTime);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function detectType(voiceText) {
  const normalizedText = voiceText.toLowerCase();

  if (
    normalizedText.includes('received') ||
    normalizedText.includes('income') ||
    normalizedText.includes('payment from')
  ) {
    return 'Income';
  }

  if (
    normalizedText.includes('spent') ||
    normalizedText.includes('expense') ||
    normalizedText.includes('kharch') ||
    normalizedText.includes('paid')
  ) {
    return 'Expense';
  }

  return 'Work Update';
}

function detectAmount(voiceText, detectedType) {
  if (detectedType !== 'Income' && detectedType !== 'Expense') {
    return 0;
  }

  const moneyContext = /₹|rs\.?|rupees?|rupaye|inr|spent|expense|kharch|paid|payment|received|income|sale|sold/i;

  if (!moneyContext.test(voiceText)) {
    return 0;
  }

  const currencyFirstMatch = voiceText.match(
    /(?:₹|rs\.?|rupees?|rupaye|inr)\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i
  );
  const numberFirstMatch = voiceText.match(
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:₹|rs\.?|rupees?|rupaye|inr)/i
  );
  const contextualMatch = voiceText.match(
    /(?:spent|expense|kharch|paid|payment|received|income|sale|sold)\D{0,20}(\d+(?:,\d{3})*(?:\.\d+)?)/i
  );
  const amountMatch = currencyFirstMatch || numberFirstMatch || contextualMatch;

  if (!amountMatch) {
    return 0;
  }

  return Number(amountMatch[1].replaceAll(',', '')) || 0;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPartyBalance(ledger, balance) {
  if (!ledger) {
    return formatCurrency(0);
  }

  if (ledger.group === 'Sundry Debtors') {
    return balance >= 0
      ? `${formatCurrency(balance)} receivable`
      : `${formatCurrency(Math.abs(balance))} advance from customer`;
  }

  if (ledger.group === 'Sundry Creditors') {
    return balance >= 0
      ? `${formatCurrency(balance)} payable`
      : `${formatCurrency(Math.abs(balance))} advance paid`;
  }

  return formatCurrency(balance);
}

function getBusinessHealthLabel(score) {
  if (score >= 80) {
    return 'Strong';
  }
  if (score >= 60) {
    return 'Stable';
  }
  if (score >= 40) {
    return 'Watch';
  }
  return 'Risk';
}

function safeMathAnswer(input) {
  const expression = input.replace(/,/g, '').replace(/\s+/g, '');
  if (!/^[\d+\-*/().\s]+$/.test(expression)) {
    return null;
  }

  try {
    let index = 0;

    const parseNumber = () => {
      let start = index;
      while (index < expression.length && /[\d.]/.test(expression[index])) {
        index += 1;
      }
      if (start === index) {
        throw new Error('Expected number');
      }
      const raw = expression.slice(start, index);
      if ((raw.match(/\./g) || []).length > 1) {
        throw new Error('Invalid number');
      }
      return Number(raw);
    };

    const parseFactor = () => {
      if (expression[index] === '+') {
        index += 1;
        return parseFactor();
      }
      if (expression[index] === '-') {
        index += 1;
        return -parseFactor();
      }
      if (expression[index] === '(') {
        index += 1;
        const value = parseExpression();
        if (expression[index] !== ')') {
          throw new Error('Missing closing parenthesis');
        }
        index += 1;
        return value;
      }
      return parseNumber();
    };

    const parseTerm = () => {
      let value = parseFactor();
      while (expression[index] === '*' || expression[index] === '/') {
        const operator = expression[index];
        index += 1;
        const next = parseFactor();
        value = operator === '*' ? value * next : value / next;
      }
      return value;
    };

    function parseExpression() {
      let value = parseTerm();
      while (expression[index] === '+' || expression[index] === '-') {
        const operator = expression[index];
        index += 1;
        const next = parseTerm();
        value = operator === '+' ? value + next : value - next;
      }
      return value;
    }

    const value = parseExpression();
    if (index !== expression.length) {
      return null;
    }
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function getLast6MonthsData(vouchers) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('en-CA').slice(0, 7);
    const label = d.toLocaleString('default', { month: 'short' });
    let sales = 0, expenses = 0;
    vouchers.forEach(v => {
      if ((v.date || '').slice(0, 7) === key) {
        if (v.type === 'Receipt' || v.type === 'Sales') sales += v.amount || 0;
        if (v.type === 'Payment' || v.type === 'Purchase') expenses += v.amount || 0;
      }
    });
    months.push({ label, key, sales, expenses, profit: sales - expenses });
  }
  return months;
}

function getTopCustomers(partySummary) {
  return partySummary
    .filter(p => p.group === 'Sundry Debtors' && p.totalSales > 0)
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);
}

// -------------------------------------------------------------
// SVG CHART COMPONENTS
// -------------------------------------------------------------

function MiniBarChart({ data, valueKey, barColor, title }) {
  const maxValue = Math.max(...data.map(d => d[valueKey] || 0), 1000);
  const height = 160;
  const width = 360;
  const paddingLeft = 45;
  const paddingBottom = 25;
  const paddingTop = 15;
  const paddingRight = 15;
  
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;
  
  const barWidth = Math.min(25, (chartWidth / data.length) * 0.6);
  const colWidth = chartWidth / data.length;

  return (
    <div className="svg-chart-container">
      <h3 className="chart-title">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
        {/* Y Axis Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingTop + chartHeight * (1 - ratio);
          const val = Math.round(maxValue * ratio);
          return (
            <g key={idx}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border-main)" strokeDasharray="3 3" opacity="0.5" />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">
                {val >= 10000000 ? `${(val/10000000).toFixed(1)}Cr` : val >= 100000 ? `${(val/100000).toFixed(1)}L` : val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}
        
        {/* Bars */}
        {data.map((item, idx) => {
          const val = item[valueKey] || 0;
          const barHeight = (val / maxValue) * chartHeight;
          const x = paddingLeft + idx * colWidth + (colWidth - barWidth) / 2;
          const y = height - paddingBottom - barHeight;
          
          return (
            <g key={idx} className="chart-bar-group">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                fill={barColor}
                rx="4"
                className="chart-rect"
              />
              {val > 0 && (
                <text x={x + barWidth/2} y={y - 4} textAnchor="middle" fontSize="8" fontWeight="bold" fill="var(--text-main)">
                  {val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                </text>
              )}
              <text x={x + barWidth/2} y={height - paddingBottom + 14} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
                {item.label}
              </text>
            </g>
          );
        })}
        {/* Baseline */}
        <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="var(--border-main)" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function ProfitTrendChart({ data }) {
  const values = data.map(d => d.profit || 0);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1000);
  
  const height = 180;
  const width = 450;
  const paddingLeft = 50;
  const paddingBottom = 30;
  const paddingTop = 20;
  const paddingRight = 20;
  
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;
  const colWidth = chartWidth / (data.length - 1 || 1);

  const getZeroY = () => {
    if (maxVal === minVal) return paddingTop + chartHeight / 2;
    return paddingTop + chartHeight * (1 - (0 - minVal) / (maxVal - minVal));
  };
  const zeroY = getZeroY();

  const getPoints = () => {
    return data.map((item, idx) => {
      const x = paddingLeft + idx * colWidth;
      const val = item.profit || 0;
      let y;
      if (maxVal === minVal) {
        y = paddingTop + chartHeight / 2;
      } else {
        y = paddingTop + chartHeight * (1 - (val - minVal) / (maxVal - minVal));
      }
      return { x, y, label: item.label, profit: val };
    });
  };

  const points = getPoints();
  
  // Smooth curve generator (Catmull-Rom to Cubic Bezier)
  const linePath = points.length === 0 ? '' : points.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const p0 = a[i - 1 === 0 ? 0 : i - 1];
    const p1 = a[i - 1];
    const p2 = point;
    const p3 = a[i + 1 !== a.length ? i + 1 : i];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }, '');

  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length-1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` 
    : '';

  return (
    <div className="svg-chart-container" style={{ width: '100%', height: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const val = Math.round(minVal + (maxVal - minVal) * ratio);
          let y = paddingTop + chartHeight * (1 - ratio);
          if (isNaN(y)) y = paddingTop;
          return (
            <g key={idx}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border-subtle)" strokeDasharray="4 4" strokeWidth="1" opacity="0.6" />
              <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
                {val >= 0 ? (val >= 1000 ? `${(val/1000).toFixed(0)}k` : val) : (val <= -1000 ? `-${(Math.abs(val)/1000).toFixed(0)}k` : val)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {areaPath && (
          <path d={areaPath} fill="url(#profitGrad)" />
        )}

        {/* Zero baseline */}
        {minVal < 0 && (
          <line x1={paddingLeft} y1={zeroY} x2={width - paddingRight} y2={zeroY} stroke="var(--border-main)" strokeWidth="1" strokeDasharray="4 4" opacity="0.8" />
        )}

        {/* Line */}
        {linePath && (
          <path d={linePath} fill="none" stroke="var(--brand-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-primary)" stroke="var(--brand-primary)" strokeWidth="2.5" className="chart-dot hover-scale" style={{ transition: 'all 0.2s' }} />
            <text x={p.x} y={height - paddingBottom + 20} textAnchor="middle" fontSize="12" fill="var(--text-muted)">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function TopCustomersChart({ data }) {
  const maxValue = Math.max(...data.map(d => d.totalSales || 0), 1000);
  const height = 160;
  const width = 360;
  const paddingLeft = 85;
  const paddingBottom = 15;
  const paddingTop = 15;
  const paddingRight = 45;
  
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;
  const rowHeight = chartHeight / (data.length || 1);
  const barHeight = Math.min(16, rowHeight * 0.5);

  return (
    <div className="svg-chart-container">
      <h3 className="chart-title">Top Customers (by Sales)</h3>
      {data.length === 0 ? (
        <div className="empty-chart-state">No customer sales recorded yet.</div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
          {data.map((item, idx) => {
            const val = item.totalSales || 0;
            const barWidth = (val / maxValue) * chartWidth;
            const y = paddingTop + idx * rowHeight + (rowHeight - barHeight) / 2;
            
            return (
              <g key={item.id}>
                <text x={paddingLeft - 8} y={y + barHeight/2 + 3} textAnchor="end" fontSize="10" fontWeight="bold" fill="var(--text-main)" className="chart-label-text">
                  {item.name.length > 12 ? `${item.name.slice(0, 10)}...` : item.name}
                </text>
                <rect
                  x={paddingLeft}
                  y={y}
                  width={Math.max(barWidth, 4)}
                  height={barHeight}
                  fill="#3b82f6"
                  rx="3"
                  className="chart-rect"
                />
                <text x={paddingLeft + barWidth + 6} y={y + barHeight/2 + 3.5} textAnchor="start" fontSize="9" fontWeight="bold" fill="var(--text-main)">
                  ₹{val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                </text>
              </g>
            );
          })}
          <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="var(--border-main)" strokeWidth="1.5" />
        </svg>
      )}
    </div>
  );
}

function CircularHealthScore({ score }) {
  const radius = 35;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let strokeColor = '#ef4444';
  if (score >= 80) strokeColor = '#10b981';
  else if (score >= 60) strokeColor = '#0d9488';
  else if (score >= 40) strokeColor = '#d97706';

  return (
    <div className="circular-score-wrap">
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          stroke="var(--bg-card-dark)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={strokeColor}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.35s' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          fontSize="14"
          fontWeight="bold"
          fill="var(--text-main)"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        >
          {score}
        </text>
      </svg>
    </div>
  );
}

export default function VoiceExpenseTrackerPreview() {
  const [authView, setAuthView] = useState(() => {
    if (isPasswordRecoveryRoute()) {
      return 'new-password';
    }
    if (import.meta.env.PROD) {
      return 'landing';
    }
    return localStorage.getItem(AUTH_KEY) ? 'app' : 'landing';
  });
  const [authUser, setAuthUser] = useState(() => {
    try {
      if (import.meta.env.PROD) {
        return null;
      }
      const storedUser = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      if (storedUser?.uid || storedUser?.email) {
        setStorageScope(storedUser.uid || storedUser.email);
      }
      return storedUser;
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [appLoading, setAppLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [quickNote, setQuickNote] = useState(() => {
    try {
      return localStorage.getItem('trinetr-quick-notes') || '';
    } catch {
      return '';
    }
  });

  
  // CRM Module State
  const [selectedCrmCustomer, setSelectedCrmCustomer] = useState(null);
  const [secureError, setSecureError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [verificationResending, setVerificationResending] = useState(false);
  const [passwordResetCooldown, setPasswordResetCooldown] = useState(0);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authDebugInfo, setAuthDebugInfo] = useState({
    email: '',
    uid: '',
    emailVerified: false,
    confirmationSentAt: '',
    confirmedAt: '',
    lastResendAt: '',
    sessionState: 'unknown',
    emailRedirectTo: '',
    lastAuthActionAt: '',
  });
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [supabaseEnabled] = useState(() => isSupabaseConfigured());
  const [transcript, setTranscript] = useState('Click start and speak your expense...');
  const [status, setStatus] = useState('Idle');
  const [language, setLanguage] = useState('en-IN');
  const [logs, setLogs] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [cloudCustomers, setCloudCustomers] = useState([]);
  const [cloudSuppliers, setCloudSuppliers] = useState([]);
  const [cloudInventory, setCloudInventory] = useState([]);
  const [cloudStockTransactions, setCloudStockTransactions] = useState([]);
  const [cloudInvoices, setCloudInvoices] = useState([]);
  const [cloudOrders, setCloudOrders] = useState([]);
  const [cloudEmployees, setCloudEmployees] = useState([]);
  const [cloudAttendance, setCloudAttendance] = useState([]);
  const [cloudLeaveBalances, setCloudLeaveBalances] = useState([]);
  const [cloudLeaveRequests, setCloudLeaveRequests] = useState([]);
  const [cloudHolidays, setCloudHolidays] = useState([]);
  const [cloudSalaryHistory, setCloudSalaryHistory] = useState([]);
  const [cloudPayslips, setCloudPayslips] = useState([]);
  const [cloudEmployeeDocuments, setCloudEmployeeDocuments] = useState([]);
  const [cloudPayments, setCloudPayments] = useState([]);
  const [cloudAuditLogs, setCloudAuditLogs] = useState([]);
  const [cloudSubscription, setCloudSubscription] = useState(null);
  const [cloudSecurity, setCloudSecurity] = useState(null);
  const [cloudDevices, setCloudDevices] = useState([]);
  const [cloudOfflineQueue, setCloudOfflineQueue] = useState([]);
  const [cloudBusinesses, setCloudBusinesses] = useState([]);
  const [cloudNotifications, setCloudNotifications] = useState([]);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [employeeUserMappings, setEmployeeUserMappings] = useState([]);
  const [employeeLinkForm, setEmployeeLinkForm] = useState({ employeeId: '', email: '' });
  const [employeeSelfTab, setEmployeeSelfTab] = useState('dashboard');
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberNotice, setMemberNotice] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberInvite, setMemberInvite] = useState({
    name: '',
    email: '',
    role: 'staff',
  });
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [manualType, setManualType] = useState('Expense');
  const [manualAmount, setManualAmount] = useState('');
  const [manualText, setManualText] = useState('');
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [showTour, setShowTour] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [voucherType, setVoucherType] = useState('Receipt');
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [voucherAmount, setVoucherAmount] = useState('');
  const [voucherNarration, setVoucherNarration] = useState('');
  const [voucherCashId, setVoucherCashId] = useState(CASH_LEDGER_ID);
  const [voucherPartyId, setVoucherPartyId] = useState('');
  const [voucherExpenseId, setVoucherExpenseId] = useState(DEFAULT_EXPENSE_LEDGER_ID);
  const [useExpenseInsteadOfSupplier, setUseExpenseInsteadOfSupplier] = useState(true);
  const [useSalesInsteadOfParty, setUseSalesInsteadOfParty] = useState(true);
  const [editingVoucher, setEditingVoucher] = useState(null);

  const [statementLedgerId, setStatementLedgerId] = useState('');
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyType, setNewPartyType] = useState('customer');
  const [dayBookFilter, setDayBookFilter] = useState('');
  const [dayBookFromDate, setDayBookFromDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [dayBookToDate, setDayBookToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('Ask about profit, loss, cash balance, party balance, or type a calculation.');
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.slice(1);
    return APP_TABS.includes(hash) ? hash : 'dashboard';
  });
  const [voiceConfirmation, setVoiceConfirmation] = useState(null);
  const [activeReportTab, setActiveReportTab] = useState('pnl');
  const [openSidebarSections, setOpenSidebarSections] = useState({
    overview: true,
    setup: true,
    'daily-work': true,
    'inventory-work': true,
    'people-ledger': true,
    'reports-accounting': true,
    'automation-admin': true,
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarSectionRefs = useRef({});
  const recoverySessionPreparedRef = useRef(false);
  const passwordResetInFlightRef = useRef(false);
  const hasVerifiedAccess = !REQUIRE_VERIFIED_EMAIL || Boolean(authUser?.emailVerified);
  const isCompanyOwner = String(authUser?.role || '').toLowerCase() === 'owner';
  const canViewDatabaseDebug = import.meta.env.DEV || import.meta.env.VITE_DEBUG_DATABASE === 'true';
  const canViewAuthDebug = import.meta.env.DEV || import.meta.env.VITE_DEBUG_AUTH === 'true';
  const activeSidebarSection = SIDEBAR_SECTIONS.find((group) => group.children.some((child) => child.tab === activeTab));
  const activeSidebarItem = activeSidebarSection?.children.find((child) => child.tab === activeTab);
  const activePageTitle = activeSidebarItem?.label || 'Dashboard';
  const renderedTabs = new Set([
    'dashboard',
    'ai-assistant',
    'inventory',
    'invoices',
    'gst',
    'crm',
    'suppliers',
    'businesses',
    'cloud-backup',
    'notifications',
    'analytics',
    'mobile-app',
    'whatsapp-automation',
    'upi-payments',
    'orders',
    'voice-bookkeeper',
    'employees',
    'subscriptions',
    'accountant-portal',
    'security-center',
    'user-management',
    'voucher-entry',
    'party-management',
    'reports',
    'day-book',
    'party-statement',
    'company-setup',
    'masters',
    'vouchers-hub',
    'accounting-ledgers',
    'reports-hub',
    'profile-settings',
    'app-settings',
    ...(canViewDatabaseDebug ? ['database-test'] : []),
    ...LEGAL_PAGE_IDS,
  ]);
  const shouldShowRouteFallback = !appLoading && !renderedTabs.has(activeTab);

  const mergeAuthDebugInfo = (next = {}) => {
    setAuthDebugInfo((current) => ({
      ...current,
      ...next,
      email: next.email || current.email || authUser?.email || '',
      uid: next.uid || current.uid || authUser?.uid || '',
      emailVerified: typeof next.emailVerified === 'boolean'
        ? next.emailVerified
        : Boolean(current.emailVerified || authUser?.emailVerified),
    }));
  };

  const requireSensitiveAccess = (actionName = 'this action') => {
    if (!authUser) {
      setSecureError('Please sign in before using this feature.');
      setStatus('Authentication required');
      return false;
    }

    if (REQUIRE_VERIFIED_EMAIL && !authUser.emailVerified) {
      setSecureError(`Please verify your email before using ${actionName}.`);
      setStatus('Email verification required');
      return false;
    }

    return true;
  };

  const refreshCompanyMembers = async () => {
    if (!supabaseEnabled || !authUser?.uid || !isCompanyOwner) {
      setCompanyMembers([]);
      return;
    }

    setMembersLoading(true);
    setMemberError('');
    try {
      const members = await loadCompanyMembers(authUser.uid, 'default');
      setCompanyMembers(members);
    } catch (error) {
      setMemberError(publicSafeError(error, 'Could not load company members. Run the member management SQL migration and try again.'));
    } finally {
      setMembersLoading(false);
    }
  };

  const refreshEmployeeUserMappings = async () => {
    if (!supabaseEnabled || !authUser?.uid || !isCompanyOwner) {
      setEmployeeUserMappings([]);
      return;
    }
    try {
      const mappings = await loadEmployeeUserMappings(authUser.uid, 'default');
      setEmployeeUserMappings(mappings);
    } catch (error) {
      setMemberError(publicSafeError(error, 'Could not load employee login mappings. Run the HRMS Phase D SQL migration and try again.'));
    }
  };

  useEffect(() => {
    if (authView === 'app' && hasVerifiedAccess) {
      refreshCompanyMembers();
      refreshEmployeeUserMappings();
    }
  }, [authView, hasVerifiedAccess, authUser?.uid, authUser?.role, supabaseEnabled]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && APP_TABS.includes(hash)) {
        setActiveTab(hash);
        const section = SIDEBAR_SECTIONS.find((group) => group.children.some((child) => child.tab === hash));
        if (section) {
          setOpenSidebarSections((current) => ({
            ...current,
            [section.id]: true,
          }));
        }
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (authView !== 'app' || !authUser || !hasVerifiedAccess) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, [authView, authUser?.uid, hasVerifiedAccess]);

  useEffect(() => {
    const section = SIDEBAR_SECTIONS.find((group) => group.children.some((child) => child.tab === activeTab));
    const sectionNode = section ? sidebarSectionRefs.current[section.id] : null;
    if (!sectionNode) {
      return;
    }

    window.setTimeout(() => {
      sectionNode.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    }, 90);
  }, [activeTab, openSidebarSections]);

  const toggleSidebarSection = (sectionId) => {
    setOpenSidebarSections((current) => {
      return {
        ...current,
        [sectionId]: !current[sectionId],
      };
    });
  };

  const hydrateWorkspace = ({ cloudTransactions = null, cloudProfile = null } = {}) => {
    if (!getSpeechRecognition()) {
      setBrowserSupported(false);
    }

    const initialLedgers = ensureDefaultLedgers();
    const initialLogs = import.meta.env.DEV ? readSavedLogs() : [];
    const initialVouchers = sortVouchersNewestFirst(
      Array.isArray(cloudTransactions)
        ? cloudTransactions
        : migrateLogsToVouchers(initialLogs, initialLedgers)
    );

    setLedgers(initialLedgers);
    setVouchers(initialVouchers);
    setLogs(initialLogs);
    setProfile(cloudProfile ? { ...DEFAULT_PROFILE, ...cloudProfile } : readProfile());

    const parties = getPartyLedgers(initialLedgers);
    if (parties.length > 0) {
      setStatementLedgerId(parties[0].id);
      setVoucherPartyId(parties[0].id);
      setUseSalesInsteadOfParty(false);
    }

    setAppLoading(false);
  };

  const applyAuthenticatedUser = async (nextUser, { restoreCloud = true } = {}) => {
    let mappedRole = nextUser.role || 'Owner';
    let employeeMapping = null;

    if (supabaseEnabled && restoreCloud) {
      try {
        const mappingData = await loadCurrentEmployeeMapping();
        if (mappingData) {
          employeeMapping = mappingData;
          mappedRole = 'Employee';
          if (mappingData.status !== 'active') {
            setSecureError('Your employee access is disabled.');
            signOutSupabase();
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load employee mapping:', err);
      }
    }

    let scopedUser = {
      ...nextUser,
      uid: employeeMapping ? employeeMapping.ownerUserId : (nextUser.uid || nextUser.email),
      authUid: nextUser.uid || nextUser.email,
      role: mappedRole,
      loginAt: new Date().toISOString(),
      employeeMapping,
    };

    setStorageScope(scopedUser.uid || scopedUser.email);
    if (!import.meta.env.PROD) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(scopedUser));
    }
    setAuthUser(scopedUser);
    
    if (REQUIRE_VERIFIED_EMAIL && !scopedUser.emailVerified) {
      setAuthView('verify-email');
      setSecureError('');
      setStatus('Email verification required');
      return;
    }

    if (scopedUser.forcePasswordChange) {
      setAuthView('force-password-change');
      setSecureError('');
      setStatus('Password change required for security');
      return;
    }

    setAuthView('app');
    setSecureError('');
    setAppLoading(false);

    if (restoreCloud && supabaseEnabled) {
      try {
        const mapping = await loadCurrentEmployeeMapping();
        if (mapping?.ownerUserId && mapping?.employeeId) {
          scopedUser = {
            ...scopedUser,
            uid: mapping.ownerUserId,
            ownerUid: mapping.ownerUserId,
            authUid: nextUser.uid || scopedUser.authUid,
            role: 'Employee',
            employeeId: mapping.employeeId,
            employeeMappingId: mapping.id,
            businessId: mapping.businessId || 'default',
          };
          setStorageScope(scopedUser.uid);
          setAuthUser(scopedUser);
          setEmployeeSelfTab('dashboard');
        }
      } catch (error) {
        debugError('EMPLOYEE_MAPPING_LOAD_ERROR', {
          code: error?.code || null,
          message: error?.message || String(error),
        });
      }
    }

    let cloudTransactions = null;
    let cloudProfile = null;
    if (restoreCloud && supabaseEnabled && scopedUser.uid) {
      if (String(scopedUser.role || '').toLowerCase() === 'employee') {
        const loadEmployeeCollection = async (tableName) => {
          try {
            const rows = await loadCloudCollection(scopedUser.uid, tableName);
            return { ok: true, tableName, rows };
          } catch (error) {
            debugError('SUPABASE_EMPLOYEE_MODULE_LOAD_ERROR', {
              tableName,
              uid: scopedUser.uid,
              employeeId: scopedUser.employeeId,
              code: error?.code || null,
              message: error?.message || String(error),
            });
            return { ok: false, tableName, rows: [], error };
          }
        };
        const [
          employeesResult,
          attendanceResult,
          leaveBalancesResult,
          leaveRequestsResult,
          holidaysResult,
          salaryHistoryResult,
          payslipsResult,
          employeeDocumentsResult,
        ] = await Promise.all([
          loadEmployeeCollection('employees'),
          loadEmployeeCollection('attendance'),
          loadEmployeeCollection('leave_balances'),
          loadEmployeeCollection('leave_requests'),
          loadEmployeeCollection('holidays'),
          loadEmployeeCollection('salary_history'),
          loadEmployeeCollection('payslips'),
          loadEmployeeCollection('employee_documents'),
        ]);
        setCloudEmployees(employeesResult.ok ? employeesResult.rows : []);
        setCloudAttendance(attendanceResult.ok ? attendanceResult.rows : []);
        setCloudLeaveBalances(leaveBalancesResult.ok ? leaveBalancesResult.rows : []);
        setCloudLeaveRequests(leaveRequestsResult.ok ? leaveRequestsResult.rows : []);
        setCloudHolidays(holidaysResult.ok ? holidaysResult.rows : []);
        setCloudSalaryHistory(salaryHistoryResult.ok ? salaryHistoryResult.rows : []);
        setCloudPayslips(payslipsResult.ok ? payslipsResult.rows : []);
        setCloudEmployeeDocuments(employeeDocumentsResult.ok ? employeeDocumentsResult.rows : []);
        setCloudCustomers([]);
        setCloudSuppliers([]);
        setCloudInventory([]);
        setCloudStockTransactions([]);
        setCloudInvoices([]);
        setCloudOrders([]);
        setCloudPayments([]);
        setVouchers([]);
        setLedgers([]);
        setLogs([]);
        setProfile(readProfile());
        setAppLoading(false);
        setTransactionsLoading(false);
        setPeopleLoading(false);
        setAuthView('app');
        setStatus('Employee self-service login active');
        return;
      }
      const transactionPath = `users/${scopedUser.uid}/transactions`;
      debugInfo('SUPABASE_PATH_USED', {
        feature: 'transactions_load',
        path: transactionPath,
        uid: scopedUser.uid,
      });
      setTransactionsLoading(true);
      setPeopleLoading(true);
      const loadModuleCollection = async (tableName) => {
        if (scopedUser?.mode === 'demo' && window.demoData && window.demoData[tableName]) {
          return { ok: true, tableName, rows: window.demoData[tableName] };
        }
        try {
          const rows = await loadCloudCollection(scopedUser.uid, tableName);
          return { ok: true, tableName, rows };
        } catch (error) {
          debugError('SUPABASE_MODULE_LOAD_ERROR', {
            tableName,
            projectId: getSupabaseProjectHost(),
            authDomain: getSupabaseUrl() || null,
            uid: scopedUser.uid,
            code: error?.code || null,
            message: error?.message || String(error),
          });
          return { ok: false, tableName, rows: [], error };
        }
      };
      const loadProfileSettings = async () => {
        try {
          const profileRows = await loadUserProfileSettings(scopedUser.uid);
          return { ok: true, profileRows };
        } catch (error) {
          debugError('SUPABASE_MODULE_LOAD_ERROR', {
            tableName: 'settings',
            projectId: getSupabaseProjectHost(),
            authDomain: getSupabaseUrl() || null,
            uid: scopedUser.uid,
            code: error?.code || null,
            message: error?.message || String(error),
          });
          return { ok: false, profileRows: null, error };
        }
      };
      const [
        transactionsResult,
        customersResult,
        suppliersResult,
        inventoryResult,
        stockTransactionsResult,
        invoicesResult,
        ordersResult,
        employeesResult,
        attendanceResult,
        leaveBalancesResult,
        leaveRequestsResult,
        holidaysResult,
        salaryHistoryResult,
        payslipsResult,
        employeeDocumentsResult,
        paymentsResult,
        auditLogsResult,
        subscriptionRowsResult,
        securityRowsResult,
        devicesResult,
        offlineQueueResult,
        businessesResult,
        notificationsResult,
        profileSettingsResult,
      ] = await Promise.all([
        loadModuleCollection('transactions'),
        loadModuleCollection('customers'),
        loadModuleCollection('suppliers'),
        loadModuleCollection('inventory'),
        loadModuleCollection('stock_transactions'),
        loadModuleCollection('invoices'),
        loadModuleCollection('orders'),
        loadModuleCollection('employees'),
        loadModuleCollection('attendance'),
        loadModuleCollection('leave_balances'),
        loadModuleCollection('leave_requests'),
        loadModuleCollection('holidays'),
        loadModuleCollection('salary_history'),
        loadModuleCollection('payslips'),
        loadModuleCollection('employee_documents'),
        loadModuleCollection('payments'),
        loadModuleCollection('audit_logs'),
        loadModuleCollection('subscriptions'),
        loadModuleCollection('security_settings'),
        loadModuleCollection('devices'),
        loadModuleCollection('offline_queue'),
        loadModuleCollection('businesses'),
        loadModuleCollection('notifications'),
        loadProfileSettings(),
      ]);
      const transactions = transactionsResult.ok ? transactionsResult.rows : [];
      const customers = customersResult.ok ? customersResult.rows : [];
      const suppliers = suppliersResult.ok ? suppliersResult.rows : [];
      const inventory = inventoryResult.ok ? inventoryResult.rows : [];
      const stockTransactions = stockTransactionsResult.ok ? stockTransactionsResult.rows : [];
      const invoices = invoicesResult.ok ? invoicesResult.rows : [];
      const orders = ordersResult.ok ? ordersResult.rows : [];
      const employees = employeesResult.ok ? employeesResult.rows : [];
      const attendance = attendanceResult.ok ? attendanceResult.rows : [];
      const leaveBalances = leaveBalancesResult.ok ? leaveBalancesResult.rows : [];
      const leaveRequests = leaveRequestsResult.ok ? leaveRequestsResult.rows : [];
      const holidays = holidaysResult.ok ? holidaysResult.rows : [];
      const salaryHistory = salaryHistoryResult.ok ? salaryHistoryResult.rows : [];
      const payslips = payslipsResult.ok ? payslipsResult.rows : [];
      const employeeDocuments = employeeDocumentsResult.ok ? employeeDocumentsResult.rows : [];
      const payments = paymentsResult.ok ? paymentsResult.rows.filter((payment) => !payment.deletedAt) : [];
      const auditLogs = auditLogsResult.ok ? auditLogsResult.rows : [];
      const subscriptionRows = subscriptionRowsResult.ok ? subscriptionRowsResult.rows : [];
      const securityRows = securityRowsResult.ok ? securityRowsResult.rows : [];
      const devices = devicesResult.ok ? devicesResult.rows : [];
      const offlineQueue = offlineQueueResult.ok ? offlineQueueResult.rows : [];
      const businesses = businessesResult.ok ? businessesResult.rows : [];
      const notifications = notificationsResult.ok ? notificationsResult.rows : [];
      const failedLoads = [
        transactionsResult,
        customersResult,
        suppliersResult,
        inventoryResult,
        stockTransactionsResult,
        invoicesResult,
        ordersResult,
        employeesResult,
        attendanceResult,
        leaveBalancesResult,
        leaveRequestsResult,
        holidaysResult,
        salaryHistoryResult,
        payslipsResult,
        employeeDocumentsResult,
        paymentsResult,
        auditLogsResult,
        subscriptionRowsResult,
        securityRowsResult,
        devicesResult,
        offlineQueueResult,
        businessesResult,
        notificationsResult,
      ].filter((result) => !result.ok);
      if (failedLoads.length) {
        const firstFailure = failedLoads[0];
        const message = `Supabase table load failed for ${firstFailure.tableName}. Run the latest supabase-schema.sql and refresh.`;
        setSecureError(message);
        setStatus(message);
        setCloudCustomers([]);
        setCloudSuppliers([]);
        setCloudInventory([]);
        setCloudStockTransactions([]);
        setCloudInvoices([]);
        setCloudOrders([]);
        setCloudEmployees([]);
        setCloudAttendance([]);
        setCloudLeaveBalances([]);
        setCloudLeaveRequests([]);
        setCloudHolidays([]);
        setCloudSalaryHistory([]);
        setCloudPayslips([]);
        setCloudEmployeeDocuments([]);
        setCloudPayments([]);
        setCloudAuditLogs([]);
        setCloudSubscription(null);
        setCloudSecurity(null);
        setCloudDevices([]);
        setCloudOfflineQueue([]);
        setCloudBusinesses([]);
        setCloudNotifications([]);
      }
      cloudTransactions = transactionsResult.ok ? transactions : null;
      cloudProfile = profileSettingsResult.ok ? profileSettingsResult.profileRows : null;
      if (customersResult.ok) setCloudCustomers(customers);
      if (suppliersResult.ok) setCloudSuppliers(suppliers);
      if (inventoryResult.ok) setCloudInventory(inventory);
      if (stockTransactionsResult.ok) setCloudStockTransactions(stockTransactions);
      if (invoicesResult.ok) setCloudInvoices(invoices);
      if (ordersResult.ok) setCloudOrders(orders);
      if (employeesResult.ok) setCloudEmployees(employees);
      if (attendanceResult.ok) setCloudAttendance(attendance);
      if (leaveBalancesResult.ok) setCloudLeaveBalances(leaveBalances);
      if (leaveRequestsResult.ok) setCloudLeaveRequests(leaveRequests);
      if (holidaysResult.ok) setCloudHolidays(holidays);
      if (salaryHistoryResult.ok) setCloudSalaryHistory(salaryHistory);
      if (payslipsResult.ok) setCloudPayslips(payslips);
      if (employeeDocumentsResult.ok) setCloudEmployeeDocuments(employeeDocuments);
      if (paymentsResult.ok) setCloudPayments(payments);
      if (auditLogsResult.ok) setCloudAuditLogs(auditLogs);
      if (subscriptionRowsResult.ok) setCloudSubscription(subscriptionRows.find((item) => item.id === 'current') || null);
      if (securityRowsResult.ok) setCloudSecurity(securityRows.find((item) => item.id === 'current') || null);
      if (devicesResult.ok) setCloudDevices(devices);
      if (offlineQueueResult.ok) setCloudOfflineQueue(offlineQueue);
      if (businessesResult.ok) setCloudBusinesses(businesses);
      if (notificationsResult.ok) setCloudNotifications(notifications);
      debugInfo('SUPABASE_PATH_USED', {
        feature: 'customers_load',
        path: `users/${scopedUser.uid}/customers`,
        uid: scopedUser.uid,
      });
      debugInfo('CUSTOMER_LOAD_SUCCESS', {
        path: `users/${scopedUser.uid}/customers`,
        uid: scopedUser.uid,
        count: customers.length,
      });
      debugInfo('SUPABASE_PATH_USED', {
        feature: 'suppliers_load',
        path: `users/${scopedUser.uid}/suppliers`,
        uid: scopedUser.uid,
      });
      debugInfo('SUPPLIER_LOAD_SUCCESS', {
        path: `users/${scopedUser.uid}/suppliers`,
        uid: scopedUser.uid,
        count: suppliers.length,
      });
      debugInfo('DASHBOARD_TRANSACTIONS_LOADED', {
        path: transactionPath,
        uid: scopedUser.uid,
        count: transactions.length,
      });
      debugInfo('DAYBOOK_TRANSACTIONS_LOADED', {
        path: transactionPath,
        uid: scopedUser.uid,
        count: transactions.length,
      });
      debugInfo('SUPABASE_MODULES_LOADED', {
        uid: scopedUser.uid,
        invoices: invoices.length,
        stockTransactions: stockTransactions.length,
        orders: orders.length,
        employees: employees.length,
        attendance: attendance.length,
        leaveBalances: leaveBalances.length,
        leaveRequests: leaveRequests.length,
        holidays: holidays.length,
        salaryHistory: salaryHistory.length,
        payslips: payslips.length,
        employeeDocuments: employeeDocuments.length,
        payments: payments.length,
        businesses: businesses.length,
        notifications: notifications.length,
      });
    }

    hydrateWorkspace({ cloudTransactions, cloudProfile });
    setTransactionsLoading(false);
    setPeopleLoading(false);
  };

  const mergeCloudListRecord = (setter, id, data) => {
    const record = { ...data, id };
    setter((items) => [record, ...(items || []).filter((item) => item.id !== id)]);
  };

  const removeCloudListRecord = (setter, id) => {
    setter((items) => (items || []).filter((item) => item.id !== id));
  };

  const updateCloudRecordCache = (collectionName, id, data) => {
    switch (collectionName) {
      case 'transactions':
        setVouchers((items) => sortVouchersNewestFirst([
          { ...data, id },
          ...(items || []).filter((item) => item.id !== id),
        ]));
        break;
      case 'customers':
        mergeCloudListRecord(setCloudCustomers, id, data);
        break;
      case 'suppliers':
        mergeCloudListRecord(setCloudSuppliers, id, data);
        break;
      case 'inventory':
        mergeCloudListRecord(setCloudInventory, id, data);
        break;
      case 'stock_transactions':
        mergeCloudListRecord(setCloudStockTransactions, id, data);
        break;
      case 'invoices':
        mergeCloudListRecord(setCloudInvoices, id, data);
        break;
      case 'orders':
        mergeCloudListRecord(setCloudOrders, id, data);
        break;
      case 'employees':
        mergeCloudListRecord(setCloudEmployees, id, data);
        break;
      case 'attendance':
        mergeCloudListRecord(setCloudAttendance, id, data);
        break;
      case 'leave_balances':
        mergeCloudListRecord(setCloudLeaveBalances, id, data);
        break;
      case 'leave_requests':
        mergeCloudListRecord(setCloudLeaveRequests, id, data);
        break;
      case 'holidays':
        mergeCloudListRecord(setCloudHolidays, id, data);
        break;
      case 'salary_history':
        mergeCloudListRecord(setCloudSalaryHistory, id, data);
        break;
      case 'payslips':
        mergeCloudListRecord(setCloudPayslips, id, data);
        break;
      case 'employee_documents':
        mergeCloudListRecord(setCloudEmployeeDocuments, id, data);
        break;
      case 'payments':
        mergeCloudListRecord(setCloudPayments, id, data);
        break;
      case 'audit_logs':
        mergeCloudListRecord(setCloudAuditLogs, id, data);
        break;
      case 'subscriptions':
        setCloudSubscription({ ...data, id });
        break;
      case 'security_settings':
        setCloudSecurity({ ...data, id });
        break;
      case 'devices':
        mergeCloudListRecord(setCloudDevices, id, data);
        break;
      case 'offline_queue':
        mergeCloudListRecord(setCloudOfflineQueue, id, data);
        break;
      case 'businesses':
        mergeCloudListRecord(setCloudBusinesses, id, data);
        break;
      case 'notifications':
        mergeCloudListRecord(setCloudNotifications, id, data);
        break;
      default:
        break;
    }
  };

  const removeCloudRecordCache = (collectionName, id) => {
    switch (collectionName) {
      case 'customers':
        removeCloudListRecord(setCloudCustomers, id);
        break;
      case 'suppliers':
        removeCloudListRecord(setCloudSuppliers, id);
        break;
      case 'inventory':
        removeCloudListRecord(setCloudInventory, id);
        break;
      case 'stock_transactions':
        removeCloudListRecord(setCloudStockTransactions, id);
        break;
      case 'invoices':
        removeCloudListRecord(setCloudInvoices, id);
        break;
      case 'orders':
        removeCloudListRecord(setCloudOrders, id);
        break;
      case 'employees':
        removeCloudListRecord(setCloudEmployees, id);
        break;
      case 'attendance':
        removeCloudListRecord(setCloudAttendance, id);
        break;
      case 'leave_balances':
        removeCloudListRecord(setCloudLeaveBalances, id);
        break;
      case 'leave_requests':
        removeCloudListRecord(setCloudLeaveRequests, id);
        break;
      case 'holidays':
        removeCloudListRecord(setCloudHolidays, id);
        break;
      case 'salary_history':
        removeCloudListRecord(setCloudSalaryHistory, id);
        break;
      case 'payslips':
        removeCloudListRecord(setCloudPayslips, id);
        break;
      case 'employee_documents':
        removeCloudListRecord(setCloudEmployeeDocuments, id);
        break;
      case 'payments':
        removeCloudListRecord(setCloudPayments, id);
        break;
      case 'audit_logs':
        removeCloudListRecord(setCloudAuditLogs, id);
        break;
      case 'subscriptions':
        setCloudSubscription(null);
        break;
      case 'security_settings':
        setCloudSecurity(null);
        break;
      case 'devices':
        removeCloudListRecord(setCloudDevices, id);
        break;
      case 'offline_queue':
        removeCloudListRecord(setCloudOfflineQueue, id);
        break;
      case 'businesses':
        removeCloudListRecord(setCloudBusinesses, id);
        break;
      case 'notifications':
        removeCloudListRecord(setCloudNotifications, id);
        break;
      default:
        break;
    }
  };

  const saveAuthenticatedCloudRecord = async (collectionName, id, data) => {
    if (!supabaseEnabled || !authUser?.uid) {
      return false;
    }

    try {
      const payload = {
        ...data,
        userId: authUser.uid,
      };
      const saved = await saveCloudRecord(authUser.uid, collectionName, id, payload);
      if (saved) {
        updateCloudRecordCache(collectionName, id, payload);
      }
      return saved;
    } catch (error) {
      setSecureError(publicSafeError(error, 'Cloud data save failed. Please try again.'));
      throw error;
    }
  };

  const uploadAuthenticatedHrmsDocument = async ({ employeeId, businessId = 'default', category, file }) => {
    if (!supabaseEnabled || !authUser?.uid || !file) {
      throw new Error('Sign in with Supabase before uploading HRMS documents.');
    }
    const path = buildHrmsStoragePath({
      uid: authUser.uid,
      businessId,
      employeeId,
      category,
      fileName: file.name,
    });
    return uploadHrmsDocument({ uid: authUser.uid, path, file });
  };

  const deleteAuthenticatedHrmsDocument = async (path) => {
    if (!supabaseEnabled || !authUser?.uid || !path) {
      return false;
    }
    return deleteHrmsDocument({ uid: authUser.uid, path });
  };

  const getAuthenticatedHrmsDocumentUrl = async (path) => {
    if (!supabaseEnabled || !authUser?.uid || !path) {
      throw new Error('Sign in with Supabase before downloading HRMS documents.');
    }
    return createHrmsDocumentSignedUrl({ uid: authUser.uid, path });
  };

  const saveAtomicInvoiceWithStock = async (invoice, inventoryItems = []) => {
    if (!supabaseEnabled || !authUser?.uid) {
      return false;
    }

    try {
      const result = await createInvoiceWithStock(authUser.uid, invoice, inventoryItems);
      if (result?.invoice?.id) {
        updateCloudRecordCache('invoices', result.invoice.id, result.invoice);
      }
      if (Array.isArray(result?.inventory)) {
        result.inventory.forEach((item) => {
          updateCloudRecordCache('inventory', item.id || item.itemId, item);
        });
      }
      if (result?.auditLogId) {
        updateCloudRecordCache('audit_logs', result.auditLogId, {
          id: result.auditLogId,
          action: 'invoice_upsert_with_stock',
          area: 'Invoices',
          targetId: result.invoice?.id || invoice.id,
          targetType: 'invoice',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      setSecureError(publicSafeError(error, 'Atomic invoice save failed. Please run the latest Supabase Phase 1 RPC migration.'));
      throw error;
    }
  };

  const postAtomicPaymentWithLedger = async (payment, ledgerPosting = {}) => {
    if (!supabaseEnabled || !authUser?.uid) {
      return false;
    }

    try {
      const result = await postPaymentWithLedger(authUser.uid, payment, ledgerPosting);
      if (result?.payment?.id) {
        updateCloudRecordCache('payments', result.payment.id, result.payment);
      }
      if (result?.ledgerPosting?.id) {
        updateCloudRecordCache('transactions', result.ledgerPosting.id, result.ledgerPosting);
      }
      if (result?.invoice?.id) {
        updateCloudRecordCache('invoices', result.invoice.id, result.invoice);
      }
      if (result?.auditLogId) {
        updateCloudRecordCache('audit_logs', result.auditLogId, result.auditLog || {
          id: result.auditLogId,
          action: 'payment_posted_with_ledger',
          area: 'Payments',
          targetId: result.payment?.id || payment.id,
          targetType: 'payment',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      setSecureError(publicSafeError(error, 'Atomic payment posting failed. Please run the latest Supabase Phase 1 payment RPC migration.'));
      throw error;
    }
  };

  const syncPaymentLedgerRpcResult = (result, fallbackPaymentId) => {
    if (result?.payment?.id && !result.payment.deletedAt) {
      updateCloudRecordCache('payments', result.payment.id, result.payment);
    }
    if (result?.payment?.deletedAt) {
      removeCloudRecordCache('payments', result.payment.id || fallbackPaymentId);
    }
    if (result?.cancelledLedgerPosting?.id) {
      updateCloudRecordCache('transactions', result.cancelledLedgerPosting.id, result.cancelledLedgerPosting);
    }
    if (result?.ledgerPosting?.id) {
      updateCloudRecordCache('transactions', result.ledgerPosting.id, result.ledgerPosting);
    }
    if (result?.invoice?.id) {
      updateCloudRecordCache('invoices', result.invoice.id, result.invoice);
    }
    if (result?.auditLogId) {
      updateCloudRecordCache('audit_logs', result.auditLogId, result.auditLog || {
        id: result.auditLogId,
        action: 'payment_reversal',
        area: 'Payments',
        targetId: result.payment?.id || fallbackPaymentId,
        targetType: 'payment',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const editAtomicPaymentWithLedgerReversal = async (payment, ledgerPosting = {}) => {
    if (!supabaseEnabled || !authUser?.uid) {
      return false;
    }

    try {
      const result = await editPaymentWithLedgerReversal(authUser.uid, payment, ledgerPosting);
      syncPaymentLedgerRpcResult(result, payment.id);
      return result;
    } catch (error) {
      setSecureError(publicSafeError(error, 'Atomic payment edit failed. Please run the latest Supabase payment reversal RPC migration.'));
      throw error;
    }
  };

  const deleteAtomicPaymentWithLedgerReversal = async (paymentId) => {
    if (!supabaseEnabled || !authUser?.uid) {
      return false;
    }

    try {
      const result = await deletePaymentWithLedgerReversal(authUser.uid, paymentId);
      syncPaymentLedgerRpcResult(result, paymentId);
      return result;
    } catch (error) {
      setSecureError(publicSafeError(error, 'Atomic payment delete failed. Please run the latest Supabase payment reversal RPC migration.'));
      throw error;
    }
  };

  const deleteAuthenticatedCloudRecord = async (collectionName, id) => {
    if (!supabaseEnabled || !authUser?.uid) {
      return false;
    }

    try {
      const deleted = await deleteCloudRecord(authUser.uid, collectionName, id);
      if (deleted) {
        removeCloudRecordCache(collectionName, id);
      }
      return deleted;
    } catch (error) {
      setSecureError(publicSafeError(error, 'Cloud data delete failed. Please try again.'));
      throw error;
    }
  };

  const handleInviteMember = async (event) => {
    event.preventDefault();
    if (!requireSensitiveAccess('member invites')) return;
    if (!isCompanyOwner) {
      setMemberError('Only the company owner can invite members.');
      return;
    }

    const email = sanitizeEmail(memberInvite.email);
    const name = sanitizeText(memberInvite.name);
    if (!validateEmail(email)) {
      setMemberError('Enter a valid member email.');
      return;
    }
    if (email === sanitizeEmail(authUser?.email || '')) {
      setMemberError('You cannot invite or change your own membership.');
      return;
    }

    setMemberSaving(true);
    setMemberError('');
    setMemberNotice('');
    try {
      const member = await inviteCompanyMember(authUser.uid, {
        name,
        email,
        role: memberInvite.role,
        businessId: 'default',
      });
      if (member?.id) {
        setCompanyMembers((items) => [member, ...(items || []).filter((item) => item.id !== member.id)]);
      } else {
        await refreshCompanyMembers();
      }
      setMemberInvite({ name: '', email: '', role: 'staff' });
      setMemberNotice('Member invite saved. Role access is controlled by Supabase RLS.');
    } catch (error) {
      setMemberError(publicSafeError(error, 'Could not invite member. Check owner access and run the member management SQL migration.'));
    } finally {
      setMemberSaving(false);
    }
  };

  const handleMemberUpdate = async (member, updates) => {
    if (!requireSensitiveAccess('member management')) return;
    if (!isCompanyOwner) {
      setMemberError('Only the company owner can manage members.');
      return;
    }
    if (member.userId && member.userId === authUser?.uid) {
      setMemberError('You cannot change your own role or status.');
      return;
    }

    setMemberSaving(true);
    setMemberError('');
    setMemberNotice('');
    try {
      const updated = await updateCompanyMember(authUser.uid, member.id, updates);
      if (updated?.id) {
        setCompanyMembers((items) => (items || []).map((item) => (item.id === updated.id ? updated : item)));
      } else {
        await refreshCompanyMembers();
      }
      setMemberNotice('Member updated and audit log recorded.');
    } catch (error) {
      setMemberError(publicSafeError(error, 'Could not update member. Check owner permissions and RLS policies.'));
    } finally {
      setMemberSaving(false);
    }
  };

  const handleMemberDisable = (member) => {
    handleMemberUpdate(member, { status: 'disabled' });
  };

  const handleMemberRemove = async (member) => {
    if (!requireSensitiveAccess('member removal')) return;
    if (!isCompanyOwner) {
      setMemberError('Only the company owner can remove members.');
      return;
    }
    if (member.userId && member.userId === authUser?.uid) {
      setMemberError('You cannot remove your own membership.');
      return;
    }
    if (!window.confirm(`Remove ${member.email || member.name || 'this member'} from the company?`)) {
      return;
    }

    setMemberSaving(true);
    setMemberError('');
    setMemberNotice('');
    try {
      await removeCompanyMember(authUser.uid, member.id);
      setCompanyMembers((items) => (items || []).filter((item) => item.id !== member.id));
      setMemberNotice('Member removed and audit log recorded.');
    } catch (error) {
      setMemberError(publicSafeError(error, 'Could not remove member. Check owner permissions and RLS policies.'));
    } finally {
      setMemberSaving(false);
    }
  };

  const handleLinkEmployeeUser = async (event) => {
    event.preventDefault();
    if (!requireSensitiveAccess('employee login mapping')) return;
    if (!isCompanyOwner) {
      setMemberError('Only the company owner can link employee login access.');
      return;
    }
    const email = sanitizeEmail(employeeLinkForm.email);
    if (!employeeLinkForm.employeeId || !validateEmail(email)) {
      setMemberError('Select an employee and enter the employee Supabase login email.');
      return;
    }
    if (email === sanitizeEmail(authUser?.email || '')) {
      setMemberError('You cannot map the owner login as an employee.');
      return;
    }

    setMemberSaving(true);
    setMemberError('');
    setMemberNotice('');
    try {
      const mapping = await linkEmployeeUserMapping(authUser.uid, {
        employeeId: employeeLinkForm.employeeId,
        email,
        businessId: 'default',
      });
      if (mapping?.id) {
        setEmployeeUserMappings((items) => [mapping, ...(items || []).filter((item) => item.id !== mapping.id)]);
      } else {
        await refreshEmployeeUserMappings();
      }
      const auditId = `aud-${Date.now().toString(36)}-employee-map`;
      await saveAuthenticatedCloudRecord('audit_logs', auditId, {
        id: auditId,
        action: 'employee login mapping updated',
        area: 'HRMS',
        module: 'Employee Self Service',
        employeeId: employeeLinkForm.employeeId,
        email,
        businessId: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch(() => false);
      setEmployeeLinkForm({ employeeId: '', email: '' });
      setMemberNotice('Employee login linked. Employee will see only self-service HRMS pages.');
    } catch (error) {
      setMemberError(publicSafeError(error, 'Could not link employee login. Make sure the employee has registered with this email and run the HRMS Phase D SQL migration.'));
    } finally {
      setMemberSaving(false);
    }
  };

  const saveCloudDataSnapshot = (reason = 'autosave') => {
    if (!supabaseEnabled || !authUser?.uid) {
      return;
    }

    if (import.meta.env.DEV) {
      setStatus(`Development backup skipped: ${reason}`);
    }
  };

  const completeAuth = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = sanitizeEmail(form.get('email')).toLowerCase().trim();
    const password = String(form.get('password') || '');
    const businessName = sanitizeText(form.get('businessName') || profile.name, 140);
    const ownerName = sanitizeText(form.get('ownerName') || profile.owner, 120);

    if (!validateEmail(email)) {
      setSecureError('Enter a valid email address.');
      return;
    }

    if (!validatePassword(password)) {
      setSecureError('Password must be at least 8 characters.');
      return;
    }

    setAuthLoading(true);
    setSecureError('');
    setAuthNotice('');

    try {
      if (import.meta.env.DEV) {
        debugInfo('[Auth form submit]', { mode: authView, email, supabaseEnabled });
      }
      if (supabaseEnabled) {
        const supabaseUser = authView === 'login'
          ? await signInSupabaseAccount({ email, password })
          : await createSupabaseAccount({ email, password, ownerName, businessName });

        mergeAuthDebugInfo({
          email: supabaseUser?.email || email,
          uid: supabaseUser?.uid || '',
          emailVerified: Boolean(supabaseUser?.emailVerified),
          confirmationSentAt: supabaseUser?.confirmationSentAt || '',
          confirmedAt: supabaseUser?.confirmedAt || '',
          sessionState: supabaseUser?.sessionState || 'unknown',
          emailRedirectTo: supabaseUser?.emailRedirectTo || '',
          lastAuthActionAt: supabaseUser?.lastAuthActionAt || new Date().toISOString(),
        });
        await applyAuthenticatedUser(supabaseUser);
        if (supabaseUser?.emailVerified && !supabaseUser?.forcePasswordChange) {
          setStatus('Secure Supabase login active');
        } else if (!supabaseUser?.emailVerified) {
          setAuthNotice(supabaseUser?.alreadyExistsUnconfirmedLikely
            ? 'This email may already be registered but not verified. Click Resend Verification Email, then check Inbox, Spam, and Promotions folders.'
            : 'Verification email sent. Check Inbox, Spam, and Promotions folders.');
          setVerificationCooldown(authView === 'register' ? 60 : 0);
          setStatus('Email verification required');
        }
        return;
      }

      if (!ALLOW_DEMO_AUTH) {
        setSecureError('Production authentication is not configured. Add Supabase environment variables before launch.');
        setStatus('Supabase authentication required');
        return;
      }

      const nextUser = {
        uid: email,
        businessName,
        ownerName,
        email,
        role: 'Owner',
        emailVerified: true,
        loginAt: new Date().toISOString(),
        mode: 'demo',
      };
      await applyAuthenticatedUser(nextUser, { restoreCloud: false });
      setSecureError('Supabase is not configured yet, so this session is running in local demo mode.');
      setStatus('Demo mode active. Configure Supabase env variables for production login.');
    } catch (error) {
      const message = getSupabaseAuthErrorMessage(error, 'Login failed. Please check your details and try again.');
      setSecureError(message);
      setAuthNotice('');
      setStatus(message);
    } finally {
      setAuthLoading(false);
    }
  };

  
  const startDemoMode = async () => {
    setAuthLoading(true);
    setSecureError('');
    setAuthNotice('');
    try {
      window.demoData = generateSampleData();
      const nextUser = {
        uid: 'demo-user',
        businessName: 'Demo Workspace',
        ownerName: 'Demo User',
        email: 'demo@trinetr.in',
        role: 'Owner',
        provider: 'Demo',
        emailVerified: true,
        loginAt: new Date().toISOString(),
        mode: 'demo',
      };
      await applyAuthenticatedUser(nextUser, { restoreCloud: false });
      setSecureError('Running in demo mode. Any changes will not affect production.');
      setStatus('Demo mode active.');
    } catch (error) {
      setSecureError('Could not start demo mode.');
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setAuthLoading(true);
    setSecureError('');
    setAuthNotice('');

    try {
      if (supabaseEnabled) {
        const supabaseUser = await signInSupabaseGoogle();
        if (!supabaseUser) {
          setStatus('Redirecting to Google sign-in');
          return;
        }
        await applyAuthenticatedUser(supabaseUser);
        setStatus('Signed in with Google');
        return;
      }

      if (!ALLOW_DEMO_AUTH) {
        setSecureError('Production Google login requires Supabase configuration.');
        setStatus('Supabase authentication required');
        return;
      }

      const nextUser = {
        uid: profile.email,
        businessName: profile.name,
        ownerName: profile.owner,
        email: profile.email,
        role: 'Owner',
        provider: 'Google',
        emailVerified: true,
        loginAt: new Date().toISOString(),
        mode: 'demo',
      };
      await applyAuthenticatedUser(nextUser, { restoreCloud: false });
      setSecureError('Supabase is not configured yet, so Google login is running in local demo mode.');
      setStatus('Google login simulated. Configure Supabase for production OAuth.');
    } catch (error) {
      const message = getSupabaseAuthErrorMessage(error, 'Google login failed. Please try again.');
      setSecureError(message);
      setAuthNotice('');
      setStatus(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();

    if (passwordResetInFlightRef.current) {
      return;
    }

    if (passwordResetCooldown > 0) {
      setSecureError('');
      setAuthNotice(`Password reset email is temporarily paused for safety. Please wait ${passwordResetCooldown}s, then request one new link.`);
      setStatus('Password reset cooldown active');
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = sanitizeEmail(form.get('email')).toLowerCase().trim();

    if (!email) {
      setSecureError('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setSecureError('Enter a valid email.');
      return;
    }

    if (!supabaseEnabled) {
      setSecureError('Password reset requires Supabase authentication to be configured.');
      setStatus('Supabase authentication required');
      return;
    }

    passwordResetInFlightRef.current = true;
    setAuthLoading(true);
    setSecureError('');
    setAuthNotice('');

    try {
      if (import.meta.env.DEV) {
        debugInfo('[Auth password reset submit]', { email });
      }
      const sent = await sendSupabasePasswordReset(email);
      if (sent) {
        setPasswordResetCooldown(60);
        setStatus('Password reset email sent');
        setSecureError('');
        setAuthNotice('Password reset email sent. Check Inbox, Spam, and Promotions folders. You can request another link after 60 seconds.');
        setAuthView('login');
      }
    } catch (error) {
      const message = getSupabaseAuthErrorMessage(error, 'Could not send password reset email. Please try again.');
      if (String(error?.code || '').toLowerCase() === 'auth/too-many-requests' || /too many|rate limit|security purposes/i.test(error?.message || '')) {
        setPasswordResetCooldown(300);
        setSecureError('');
        setAuthNotice('Supabase has temporarily paused password reset emails for this address. Please wait 5 minutes, then request one new link only.');
        setStatus('Password reset cooldown active');
      } else {
        setSecureError(message);
        setAuthNotice('');
        setStatus(message);
      }
    } finally {
      passwordResetInFlightRef.current = false;
      setAuthLoading(false);
    }
  };

  const completePasswordRecovery = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword') || '');
    const confirmPassword = String(form.get('confirmPassword') || '');

    if (!validatePassword(newPassword)) {
      setSecureError('Password must be at least 8 characters.');
      setStatus('Enter a stronger password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecureError('New password and confirm password must match.');
      setStatus('Passwords do not match');
      return;
    }

    setAuthLoading(true);
    setSecureError('');
    setAuthNotice('');
    try {
      await updateCurrentUserPassword(newPassword);
      await signOutSupabase();
      localStorage.removeItem(AUTH_KEY);
      clearStorageScope();
      window.history.replaceState({}, document.title, '/react.html');
      setAuthUser(null);
      setAuthDebugInfo({
        email: '',
        uid: '',
        emailVerified: false,
        confirmationSentAt: '',
        confirmedAt: '',
        lastResendAt: '',
        sessionState: 'signed-out',
        emailRedirectTo: '',
        lastAuthActionAt: new Date().toISOString(),
      });
      setAuthNotice('Password updated successfully. Please login again.');
      setStatus('Password updated successfully');
      setAuthView('login');
    } catch (error) {
      const message = getSupabaseAuthErrorMessage(error, error?.message || 'Password reset link is expired or invalid. Please request a new reset link.');
      setSecureError(message);
      setStatus(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    if (import.meta.env.DEV) {
      debugInfo('[Auth logout requested]', { uid: authUser?.uid || null, supabaseEnabled });
    }
    if (supabaseEnabled) {
      await signOutSupabase().catch((error) => {
        if (import.meta.env.DEV) {
          debugError('[Auth logout error]', error);
        }
      });
    }
    localStorage.removeItem(AUTH_KEY);
    clearStorageScope();
    setAuthUser(null);
    setLogs([]);
    setLedgers([]);
    setVouchers([]);
    setCloudCustomers([]);
    setCloudSuppliers([]);
    setCloudInventory([]);
    setCloudStockTransactions([]);
    setCloudInvoices([]);
    setCloudOrders([]);
    setCloudEmployees([]);
    setCloudAttendance([]);
    setCloudLeaveBalances([]);
    setCloudLeaveRequests([]);
    setCloudHolidays([]);
    setCloudSalaryHistory([]);
    setCloudPayslips([]);
    setCloudEmployeeDocuments([]);
    setCloudPayments([]);
    setCloudAuditLogs([]);
    setCloudSubscription(null);
    setCloudSecurity(null);
    setCloudDevices([]);
    setCloudOfflineQueue([]);
    setCloudBusinesses([]);
    setCloudNotifications([]);
    setCompanyMembers([]);
    setEmployeeUserMappings([]);
    setEmployeeLinkForm({ employeeId: '', email: '' });
    setEmployeeSelfTab('dashboard');
    setTransactionsLoading(false);
    setPeopleLoading(false);
    setStatementLedgerId('');
    setVoucherPartyId('');
    setSecureError('');
    setAuthNotice('');
    setAuthDebugInfo({
      email: '',
      uid: '',
      emailVerified: false,
      confirmationSentAt: '',
      confirmedAt: '',
      lastResendAt: '',
      sessionState: 'signed-out',
      emailRedirectTo: '',
      lastAuthActionAt: new Date().toISOString(),
    });
    setStatus('Logged out');
    setAuthView('login');
  };

  const resendVerificationEmail = async () => {
    if (verificationCooldown > 0) {
      return;
    }

    try {
      setAuthLoading(true);
      setVerificationResending(true);
      setSecureError('');
      const result = await sendCurrentUserEmailVerification(authUser?.email || authDebugInfo.email);
      if (result?.ok) {
        mergeAuthDebugInfo({
          email: result.email || authUser?.email || authDebugInfo.email,
          uid: result.uid || authUser?.uid || authDebugInfo.uid,
          lastResendAt: result.lastResendAt,
          sessionState: result.sessionState || authDebugInfo.sessionState,
          emailRedirectTo: result.emailRedirectTo || authDebugInfo.emailRedirectTo,
          lastAuthActionAt: result.lastResendAt,
        });
        setAuthNotice('Verification email sent. Check Inbox, Spam, and Promotions folders.');
        setVerificationCooldown(60);
        setStatus('Verification email sent');
      } else {
        setStatus('Sign in again to send verification email');
      }
    } catch (error) {
      const message = getSupabaseAuthErrorMessage(error, error?.message || 'Could not send verification email.');
      debugError('RESEND_VERIFICATION_UI_ERROR', {
        code: error?.code || null,
        message: error?.message || String(error),
        email: authUser?.email || authDebugInfo.email || '',
      });
      setSecureError(message);
      setStatus(message);
    } finally {
      setVerificationResending(false);
      setAuthLoading(false);
    }
  };

  const runDebugSupabaseTest = async () => {
    setSecureError('');
    setStatus('Running database test...');
    try {
      const result = await runSupabaseDebugTest();
      setStatus(`Database test wrote ${result.path}`);
    } catch (error) {
      const message = publicSafeError(error, 'Database test failed. Check Supabase RLS policies and signed-in session.');
      setSecureError(message);
      setStatus(message);
    }
  };

  const checkEmailVerification = async () => {
    try {
      setAuthLoading(true);
      setSecureError('');
      const refreshedUser = await reloadCurrentSupabaseUser();
      if (!refreshedUser) {
        setSecureError('Please login again before checking verification.');
        setStatus('Login required');
        return;
      }

      if (refreshedUser.emailVerified) {
        mergeAuthDebugInfo({
          email: refreshedUser.email,
          uid: refreshedUser.uid,
          emailVerified: true,
          confirmedAt: refreshedUser.confirmedAt || new Date().toISOString(),
          confirmationSentAt: refreshedUser.confirmationSentAt || authDebugInfo.confirmationSentAt,
          sessionState: refreshedUser.sessionState || 'active',
          lastAuthActionAt: new Date().toISOString(),
        });
        await applyAuthenticatedUser(refreshedUser);
        setAuthNotice('');
        setStatus('Email verified');
        return;
      }

      mergeAuthDebugInfo({
        email: refreshedUser.email,
        uid: refreshedUser.uid,
        emailVerified: false,
        confirmationSentAt: refreshedUser.confirmationSentAt || authDebugInfo.confirmationSentAt,
        sessionState: refreshedUser.sessionState || 'active',
        lastAuthActionAt: new Date().toISOString(),
      });
      setAuthNotice('Email is not verified yet. Please check Inbox, Spam, and Promotions folders.');
      setStatus('Email verification pending');
    } catch (error) {
      setSecureError(getSupabaseAuthErrorMessage(error, 'Could not check email verification.'));
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (verificationCooldown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setVerificationCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [verificationCooldown]);

  useEffect(() => {
    if (passwordResetCooldown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setPasswordResetCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [passwordResetCooldown]);

  useEffect(() => {
    localStorage.setItem('darkMode', 'false');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }, []);

  useEffect(() => {
    hydrateWorkspace();
  }, []);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!supabaseEnabled || !isPasswordRecoveryRoute() || recoverySessionPreparedRef.current) {
      return;
    }

    recoverySessionPreparedRef.current = true;
    setAuthView('new-password');
    setAuthLoading(true);
    setSecureError('');
    setAuthNotice('Preparing secure password reset session...');

    prepareSupabasePasswordRecoverySession()
      .then((user) => {
        if (!user) {
          throw new Error('Password reset session is not active. Please request a new reset link and open the latest email.');
        }
        setAuthUser(user);
        mergeAuthDebugInfo({
          email: user.email || '',
          uid: user.uid || '',
          emailVerified: Boolean(user.emailVerified),
          sessionState: 'password-recovery',
          lastAuthActionAt: new Date().toISOString(),
        });
        setAuthView('new-password');
        setSecureError('');
        setAuthNotice('Secure reset session ready. Create your new password.');
        setStatus('Password recovery session ready');
      })
      .catch((error) => {
        const message = getSupabaseAuthErrorMessage(
          error,
          'Password reset link is expired or invalid. Please request a new reset link.'
        );
        setAuthUser(null);
        setAuthView('new-password');
        setAuthNotice('');
        setSecureError(message);
        setStatus(message);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, [supabaseEnabled]);

  useEffect(() => {
    let unsubscribe = () => {};
    let active = true;

    if (!supabaseEnabled) {
      return () => {};
    }

    setAuthLoading(true);
    listenToSupabaseAuth(
      async (user) => {
        if (!active) {
          return;
        }
        if (user) {
          mergeAuthDebugInfo({
            email: user.email || '',
            uid: user.uid || '',
            emailVerified: Boolean(user.emailVerified),
            confirmationSentAt: user.confirmationSentAt || authDebugInfo.confirmationSentAt,
            confirmedAt: user.confirmedAt || '',
            sessionState: user.sessionState || 'active',
            lastAuthActionAt: new Date().toISOString(),
          });
          if (user.sessionState === 'password-recovery' || isPasswordRecoveryRoute()) {
            setAuthUser(user);
            setAuthView('new-password');
            setAuthNotice('Create a new password to finish account recovery.');
            setStatus('Password recovery session active');
            setAuthLoading(false);
            return;
          }
          await applyAuthenticatedUser(user);
        } else {
          if (import.meta.env.DEV) {
            debugInfo('[Supabase auth state]', { user: null });
          }
          if (isPasswordRecoveryRoute()) {
            setAuthView('new-password');
            setAuthNotice('');
            setSecureError('Password reset link is expired or invalid. Please request a new reset link.');
            setStatus('Password reset link expired');
          }
          mergeAuthDebugInfo({
            sessionState: 'signed-out',
            emailVerified: false,
            lastAuthActionAt: new Date().toISOString(),
          });
          setAuthUser(null);
          if (import.meta.env.PROD) {
            localStorage.removeItem(AUTH_KEY);
            clearStorageScope();
          }
        }
        setAuthLoading(false);
      },
      (error) => {
        if (!active) {
          return;
        }
        setSecureError(getSupabaseAuthErrorMessage(error, 'Supabase authentication is unavailable.'));
        setAuthLoading(false);
      }
    ).then((handler) => {
      unsubscribe = handler;
    }).catch((error) => {
      setSecureError(getSupabaseAuthErrorMessage(error, 'Supabase authentication is unavailable.'));
      setAuthLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [supabaseEnabled]);
  const partyLedgers = useMemo(() => getPartyLedgers(ledgers), [ledgers]);
  const customerParties = useMemo(
    () => partyLedgers.filter((ledger) => ledger.group === 'Sundry Debtors'),
    [partyLedgers]
  );
  const supplierParties = useMemo(
    () => partyLedgers.filter((ledger) => ledger.group === 'Sundry Creditors'),
    [partyLedgers]
  );
  const cashLedgers = useMemo(() => getCashLedgers(ledgers), [ledgers]);
  const expenseLedgers = useMemo(() => getExpenseLedgers(ledgers), [ledgers]);

  const totals = useMemo(() => voucherCashTotals(vouchers), [vouchers]);

  const statement = useMemo(
    () => getLedgerStatement(statementLedgerId, ledgers, vouchers),
    [statementLedgerId, ledgers, vouchers]
  );

  const partySummary = useMemo(() => getPartySummary(ledgers, vouchers), [ledgers, vouchers]);

  const stats = useMemo(() => {
    return getDailyAndMonthlyStats(vouchers, ledgers);
  }, [vouchers, ledgers]);

  const cashInHand = useMemo(() => {
    return cashLedgers.reduce((sum, ledger) => sum + computeLedgerBalance(ledger.id, ledgers, vouchers), 0);
  }, [cashLedgers, ledgers, vouchers]);

  const receivableTotal = useMemo(() => {
    return partySummary
      .filter(p => p.group === 'Sundry Debtors' && p.outstandingAmount > 0)
      .reduce((sum, item) => sum + item.outstandingAmount, 0);
  }, [partySummary]);

  const payableTotal = useMemo(() => {
    return partySummary
      .filter(p => p.group === 'Sundry Creditors' && p.outstandingAmount > 0)
      .reduce((sum, item) => sum + item.outstandingAmount, 0);
  }, [partySummary]);

  const monthlyNetProfit = stats.monthlySales - stats.monthlyExpenses;
  const prevMonthlyNetProfit = stats.prevMonthlySales - stats.prevMonthlyExpenses;

  const netProfitGrowth = useMemo(() => {
    if (prevMonthlyNetProfit === 0) return monthlyNetProfit > 0 ? 100 : 0;
    return Math.round(((monthlyNetProfit - prevMonthlyNetProfit) / Math.abs(prevMonthlyNetProfit)) * 100);
  }, [monthlyNetProfit, prevMonthlyNetProfit]);

  const aiInsights = useMemo(() => {
    // 1. Expense Control Score
    const expenseRatio = stats.monthlySales > 0 ? (stats.monthlyExpenses / stats.monthlySales) : 0;
    const expenseControlScore = Math.max(0, Math.min(100, Math.round(100 - (expenseRatio * 100))));

    // 2. Collection Efficiency
    let totalCustSales = 0;
    let totalCustPayments = 0;
    partySummary.forEach(p => {
      if (p.group === 'Sundry Debtors') {
        totalCustSales += p.totalSales;
        totalCustPayments += p.totalPayments;
      }
    });
    const collectionEfficiency = totalCustSales > 0 
      ? Math.max(0, Math.min(100, Math.round((totalCustPayments / totalCustSales) * 100))) 
      : 100;

    // 3. Cash Flow Status
    const cashFlowStatus = cashInHand >= 0 ? (stats.monthlySales >= stats.monthlyExpenses ? 'Healthy' : 'Strained') : 'Risk';

    // 4. Profit Trend Label
    let profitTrendLabel = 'Stable';
    if (netProfitGrowth > 5) profitTrendLabel = 'Upward';
    else if (netProfitGrowth < -5) profitTrendLabel = 'Downward';

    // Health Score calculation
    let healthScore = 50;
    healthScore += (stats.monthlySales > stats.monthlyExpenses ? 15 : -15);
    healthScore += (cashInHand > 0 ? 15 : -20);
    healthScore += Math.round(expenseControlScore * 0.2);
    healthScore += Math.round(collectionEfficiency * 0.2);
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Dynamic suggestions based on data
    const dynamicSuggestions = [];
    if (stats.expenseGrowth > 10) {
      dynamicSuggestions.push(`Expenses increased ${stats.expenseGrowth}% this month. Check where cash is going.`);
    }
    if (stats.salesGrowth < -5) {
      dynamicSuggestions.push(`Sales growth is slowing down (${stats.salesGrowth}% this month). Focus on collection and customer outreach.`);
    } else if (stats.salesGrowth > 10) {
      dynamicSuggestions.push(`Good job! Sales increased by ${stats.salesGrowth}% MoM.`);
    }

    // Top pending payments
    const pendingCustomers = partySummary
      .filter(p => p.group === 'Sundry Debtors' && p.outstandingAmount > 0)
      .sort((a, b) => b.outstandingAmount - a.outstandingAmount);
    
    if (pendingCustomers.length > 0) {
      const topPending = pendingCustomers[0];
      dynamicSuggestions.push(`${topPending.name} has pending payment of ${formatCurrency(topPending.outstandingAmount)}.`);
    }

    // Check material cost or specific ledger categories
    let materialCostThisMonth = 0;
    let materialCostPrevMonth = 0;
    vouchers.forEach(vch => {
      const month = (vch.date || '').slice(0, 7);
      const isCurrentMonth = month === new Date().toLocaleDateString('en-CA').slice(0, 7);
      const isPrevMonth = month === new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('en-CA').slice(0, 7);
      
      vch.lines.forEach(l => {
        if (l.ledgerId === 'ledger-material') {
          if (isCurrentMonth) materialCostThisMonth += l.debit || 0;
          if (isPrevMonth) materialCostPrevMonth += l.debit || 0;
        }
      });
    });

    if (materialCostThisMonth > materialCostPrevMonth && materialCostPrevMonth > 0) {
      const pct = Math.round(((materialCostThisMonth - materialCostPrevMonth) / materialCostPrevMonth) * 100);
      dynamicSuggestions.push(`Material cost is increasing (${pct}% MoM). Check supplier rates.`);
    }

    if (dynamicSuggestions.length < 3) {
      dynamicSuggestions.push('All accounts are balanced. Keep recording voice notes regularly.');
    }

    return {
      score: healthScore,
      health: getBusinessHealthLabel(healthScore),
      profitTrend: profitTrendLabel,
      cashFlowStatus,
      collectionEfficiency,
      expenseControlScore,
      suggestions: dynamicSuggestions
    };
  }, [stats, cashInHand, partySummary, vouchers, netProfitGrowth]);

  const pnlData = useMemo(() => {
    const sales = computeLedgerBalance('ledger-sales', ledgers, vouchers);
    const purchases = computeLedgerBalance('ledger-material', ledgers, vouchers);
    const rent = computeLedgerBalance('ledger-rent', ledgers, vouchers);
    const general = computeLedgerBalance('ledger-misc-expense', ledgers, vouchers);
    
    const totalExpenses = rent + general;
    const grossProfit = sales - purchases;
    const netProfitVal = grossProfit - totalExpenses;
    
    return {
      sales,
      purchases,
      rent,
      general,
      totalExpenses,
      grossProfit,
      netProfit: netProfitVal
    };
  }, [ledgers, vouchers]);

  const cashBookData = useMemo(() => {
    const cashIds = new Set(cashLedgers.map(l => l.id));
    const rows = [];
    let running = 0;
    
    const sortedVouchers = [...vouchers].sort((a, b) => a.date.localeCompare(b.date) || (a.dateTime || '').localeCompare(a.dateTime || ''));
    
    sortedVouchers.forEach(vch => {
      let cashDebit = 0;
      let cashCredit = 0;
      let affected = false;
      let particulars = '';
      
      vch.lines.forEach(line => {
        if (cashIds.has(line.ledgerId)) {
          affected = true;
          cashDebit += line.debit || 0;
          cashCredit += line.credit || 0;
        } else {
          particulars = getLedgerById(ledgers, line.ledgerId)?.name || particulars;
        }
      });
      
      if (affected) {
        running += cashDebit - cashCredit;
        rows.push({
          id: vch.id,
          date: vch.date,
          type: vch.type,
          narration: vch.narration,
          particulars: particulars || 'Sales / Expense',
          debit: cashDebit,
          credit: cashCredit,
          balance: running
        });
      }
    });
    
    return { rows, closingBalance: running };
  }, [cashLedgers, ledgers, vouchers]);

  const filteredVouchers = useMemo(() => {
    if (!dayBookFilter) {
      return vouchers;
    }
    return vouchers.filter((voucher) => voucher.date === dayBookFilter);
  }, [vouchers, dayBookFilter]);

  const recentVouchers = useMemo(() => {
    return sortVouchersNewestFirst(vouchers).slice(0, 8);
  }, [vouchers]);

  const refreshVouchers = () => setVouchers(import.meta.env.DEV ? readVouchers() : vouchers);

  const persistVoucher = async (voucher) => {
    if (!requireSensitiveAccess('voucher saving')) {
      return false;
    }

    if (authUser?.uid) {
      const transactionPayload = {
        ...voucher,
        transactionId: voucher.id,
        userId: authUser.uid,
      };
      const supabasePath = `users/${authUser.uid}/transactions/${voucher.id}`;

      debugInfo('[Transaction save request]', {
        currentSupabaseUserUid: authUser.uid,
        path: supabasePath,
        payload: transactionPayload,
      });
      debugInfo('SUPABASE_PATH_USED', {
        feature: 'transaction_write',
        path: supabasePath,
        uid: authUser.uid,
        transactionId: voucher.id,
      });

      try {
        const saved = await saveCloudRecord(authUser.uid, 'transactions', voucher.id, transactionPayload);
        if (!saved) {
          throw new Error(`Supabase write returned false for ${supabasePath}`);
        }
        debugInfo('[Transaction save success]', {
          currentSupabaseUserUid: authUser.uid,
          path: supabasePath,
          transactionId: voucher.id,
        });
        setVouchers((current) => {
          const nextVouchers = sortVouchersNewestFirst([voucher, ...current.filter((item) => item.id !== voucher.id)]);
          debugInfo('DASHBOARD_TRANSACTIONS_LOADED', {
            reason: 'transaction_saved',
            path: `users/${authUser.uid}/transactions`,
            uid: authUser.uid,
            count: nextVouchers.length,
          });
          debugInfo('DAYBOOK_TRANSACTIONS_LOADED', {
            reason: 'transaction_saved',
            path: `users/${authUser.uid}/transactions`,
            uid: authUser.uid,
            count: nextVouchers.length,
          });
          return nextVouchers;
        });
        setStatus('Transaction saved to Supabase');
        return true;
      } catch (error) {
        const message = publicSafeError(error, 'Cloud transaction save failed. Please try again.');
        debugError('[Transaction save error]', {
          currentSupabaseUserUid: authUser.uid,
          path: supabasePath,
          payload: transactionPayload,
          error,
        });
        setSecureError(message);
        setStatus(message);
        return false;
      }
    }

    if (import.meta.env.DEV) {
      saveVoucher(voucher);
      refreshVouchers();
      debugInfo('[Transaction saved in development storage]', {
        reason: 'No Supabase user is available in local development.',
        transactionId: voucher.id,
        payload: voucher,
      });
      setStatus('Development transaction saved locally');
      return true;
    }

    setSecureError('Sign in with Supabase before saving production transactions.');
    setStatus('Supabase sign-in required');
    return false;
  };

  const saveReceiptOrPayment = async ({
    type,
    amount,
    narration,
    cashLedgerId,
    counterLedgerId,
    source,
    date,
  }) => {
    const lines =
      type === 'Receipt'
        ? buildReceiptLines(amount, cashLedgerId, counterLedgerId)
        : buildPaymentLines(amount, counterLedgerId, cashLedgerId);

    const voucher = createVoucher({
      type,
      amount,
      narration,
      lines,
      source,
      date,
    });

    const saved = await persistVoucher(voucher);
    return saved ? voucher : null;
  };

  const buildEditedVoucher = ({ type, amount, narration, date }) => {
    let lines;
    if (type === 'Receipt') {
      const creditLedgerId = useSalesInsteadOfParty ? SALES_LEDGER_ID : voucherPartyId || SALES_LEDGER_ID;
      lines = buildReceiptLines(amount, voucherCashId, creditLedgerId);
    } else if (type === 'Payment') {
      const debitLedgerId = useExpenseInsteadOfSupplier ? voucherExpenseId : voucherPartyId || voucherExpenseId;
      lines = buildPaymentLines(amount, debitLedgerId, voucherCashId);
    } else if (type === 'Sales') {
      if (!voucherPartyId || useSalesInsteadOfParty) {
        throw new Error('Select a customer party for credit sale');
      }
      lines = buildCreditSaleLines(amount, voucherPartyId, SALES_LEDGER_ID);
    } else if (type === 'Purchase') {
      if (!voucherPartyId || useExpenseInsteadOfSupplier) {
        throw new Error('Select a supplier party for credit purchase');
      }
      lines = buildCreditPurchaseLines(amount, voucherExpenseId || MATERIAL_LEDGER_ID, voucherPartyId);
    }

    return {
      ...editingVoucher,
      id: editingVoucher.id,
      type,
      amount,
      narration,
      date,
      lines,
      source: editingVoucher.source || 'manual',
      createdAt: editingVoucher.createdAt || editingVoucher.dateTime || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const saveVoucherEntry = async (event) => {
    event.preventDefault();

    if (!requireSensitiveAccess('voucher entry')) {
      return;
    }

    const amount = normalizeAmount(voucherAmount);
    const narration = sanitizeText(voucherNarration, 300);

    if (amount <= 0) {
      setStatus('Enter a voucher amount greater than zero');
      return;
    }

    if (!narration) {
      setStatus('Enter narration for this voucher');
      return;
    }

    try {
      let savedVoucher = null;
      if (editingVoucher) {
        const voucher = buildEditedVoucher({
          type: voucherType,
          amount,
          narration,
          date: voucherDate,
        });
        savedVoucher = await persistVoucher(voucher) ? voucher : null;
      } else if (voucherType === 'Receipt') {
        const creditLedgerId = useSalesInsteadOfParty
          ? SALES_LEDGER_ID
          : voucherPartyId || SALES_LEDGER_ID;

        savedVoucher = await saveReceiptOrPayment({
          type: 'Receipt',
          amount,
          narration,
          cashLedgerId: voucherCashId,
          counterLedgerId: creditLedgerId,
          source: 'manual',
          date: voucherDate,
        });
      } else if (voucherType === 'Payment') {
        const debitLedgerId = useExpenseInsteadOfSupplier
          ? voucherExpenseId
          : voucherPartyId || voucherExpenseId;

        savedVoucher = await saveReceiptOrPayment({
          type: 'Payment',
          amount,
          narration,
          cashLedgerId: voucherCashId,
          counterLedgerId: debitLedgerId,
          source: 'manual',
          date: voucherDate,
        });
      } else if (voucherType === 'Sales') {
        if (!voucherPartyId || useSalesInsteadOfParty) {
          setStatus('Select a customer party for credit sale');
          return;
        }

        const voucher = createVoucher({
          type: 'Sales',
          amount,
          narration,
          lines: buildCreditSaleLines(amount, voucherPartyId, SALES_LEDGER_ID),
          source: 'manual',
          date: voucherDate,
        });
        savedVoucher = await persistVoucher(voucher) ? voucher : null;
      } else if (voucherType === 'Purchase') {
        if (!voucherPartyId || useExpenseInsteadOfSupplier) {
          setStatus('Select a supplier party for credit purchase');
          return;
        }

        const voucher = createVoucher({
          type: 'Purchase',
          amount,
          narration,
          lines: buildCreditPurchaseLines(amount, voucherExpenseId || MATERIAL_LEDGER_ID, voucherPartyId),
          source: 'manual',
          date: voucherDate,
        });
        savedVoucher = await persistVoucher(voucher) ? voucher : null;
      }

      if (!savedVoucher) {
        return;
      }
      setVoucherAmount('');
      setVoucherNarration('');
      setEditingVoucher(null);
    } catch (error) {
      setStatus(error.message);
    }
  };  const handleSaveVoiceConfirmation = async (confirmedData) => {
    if (!requireSensitiveAccess('voice saving')) {
      return;
    }

    const validation = validateVoicePayload(confirmedData);
    if (!validation.valid && confirmedData.confidence < 0.35) {
      setSecureError(validation.errors.join(' '));
      setStatus('Please review unclear voice input before saving');
      return;
    }

    const type = mapVoiceTypeToAccounting(confirmedData.type || confirmedData.accountingType);
    const amount = normalizeAmount(confirmedData.amount);
    const partyName = sanitizeText(confirmedData.partyName || confirmedData.customer, 120);
    const category = sanitizeText(confirmedData.category, 120);
    const date = confirmedData.date;
    const narration = sanitizeText(confirmedData.narration || confirmedData.notes || confirmedData.transcript, 300);

    if (amount <= 0) {
      setStatus('Amount must be greater than zero');
      return;
    }

    try {
      let savedVoucher = null;
      let resolvedPartyId = '';
      if (partyName.trim()) {
        const partyType = (type === 'Receipt' || type === 'Sales') ? 'customer' : 'supplier';
        const { ledgers: nextLedgers, ledger } = addPartyLedger(partyName, partyType);
        setLedgers(nextLedgers);
        resolvedPartyId = ledger.id;
        setVoucherPartyId(ledger.id);
        setStatementLedgerId(ledger.id);
        setUseSalesInsteadOfParty(false);
      }

      const defaultCashId = CASH_LEDGER_ID;
      
      let resolvedCategoryLedgerId = DEFAULT_EXPENSE_LEDGER_ID;
      if (category === 'Material / Purchase') resolvedCategoryLedgerId = MATERIAL_LEDGER_ID;
      else if (category === 'Rent') resolvedCategoryLedgerId = 'ledger-rent';
      else if (category === 'Sales') resolvedCategoryLedgerId = SALES_LEDGER_ID;

      const targetDate = date || new Date().toISOString().slice(0, 10);

      if (type === 'Receipt') {
        savedVoucher = await saveReceiptOrPayment({
          type: 'Receipt',
          amount,
          narration,
          cashLedgerId: defaultCashId,
          counterLedgerId: resolvedPartyId || SALES_LEDGER_ID,
          source: 'voice',
          date: targetDate,
        });
      } else if (type === 'Payment') {
        savedVoucher = await saveReceiptOrPayment({
          type: 'Payment',
          amount,
          narration,
          cashLedgerId: defaultCashId,
          counterLedgerId: resolvedPartyId || resolvedCategoryLedgerId,
          source: 'voice',
          date: targetDate,
        });
      } else if (type === 'Sales') {
        if (!resolvedPartyId) {
          throw new Error('Customer party name is required for credit sale');
        }
        const voucher = createVoucher({
          type: 'Sales',
          amount,
          narration,
          lines: buildCreditSaleLines(amount, resolvedPartyId, SALES_LEDGER_ID),
          source: 'voice',
          date: targetDate,
        });
        savedVoucher = await persistVoucher(voucher) ? voucher : null;
      } else if (type === 'Purchase') {
        if (!resolvedPartyId) {
          throw new Error('Supplier party name is required for credit purchase');
        }
        const voucher = createVoucher({
          type: 'Purchase',
          amount,
          narration,
          lines: buildCreditPurchaseLines(amount, resolvedCategoryLedgerId || MATERIAL_LEDGER_ID, resolvedPartyId),
          source: 'voice',
          date: targetDate,
        });
        savedVoucher = await persistVoucher(voucher) ? voucher : null;
      }

      if (!savedVoucher) {
        return;
      }
      setVoiceConfirmation(null);
      setSecureError('');
    } catch (error) {
      const message = publicSafeError(error);
      setSecureError(message);
      setStatus(message);
    }
  };

  const startVoiceRecognition = async () => {
    if (!requireSensitiveAccess('voice entry')) {
      return;
    }

    const rateLimit = canRunRateLimitedAction(`voice:${authUser?.uid || 'guest'}`, { limit: 8, windowMs: 60_000 });
    if (!rateLimit.allowed) {
      setSecureError(rateLimit.message);
      setStatus(rateLimit.message);
      return;
    }

    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setStatus('Voice recognition is not supported in this browser');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Microphone access is not available in this browser');
      return;
    }

    try {
      if (navigator.permissions?.query) {
        const permissionStatus = await navigator.permissions.query({
          name: 'microphone',
        });

        if (permissionStatus.state === 'denied') {
          setStatus('Microphone permission denied');
          setSecureError('Please allow microphone access in browser settings and refresh the page.');
          return;
        }
      }

      await navigator.mediaDevices.getUserMedia({ audio: true });

      const recognition = new SpeechRecognition();

      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      setStatus('Listening...');
      setVoiceConfirmation(null);
      recognition.start();

      recognition.onresult = (event) => {
        const voiceText = event.results[0][0].transcript;
        const speechConfidence = event.results[0][0].confidence || 0;
        setTranscript(voiceText);

        const parsed = parseReliableVoiceCommand(voiceText, partyLedgers, speechConfidence);
        
        setVoiceConfirmation(parsed);
        setStatus(parsed.unclear ? 'Speech unclear. Please edit or retry.' : 'Voice parsed. Review before saving.');
      };

      recognition.onnomatch = () => {
        setStatus('Speech was unclear. Please retry closer to the microphone.');
      };

      recognition.onerror = (event) => {
        switch (event.error) {
          case 'not-allowed':
            setStatus('Microphone permission denied');
            break;
          case 'no-speech':
            setStatus('No voice detected');
            setSecureError('No speech was detected. Tap retry and speak one clear transaction.');
            break;
          case 'network':
            setStatus('Internet is required for voice recognition');
            break;
          case 'audio-capture':
            setStatus('No microphone found');
            break;
          default:
            setStatus(`Error: ${event.error}`);
        }
      };
    } catch (error) {
      setSecureError(publicSafeError(error, 'Microphone permission is required for voice entries.'));
      setStatus('Please allow microphone permission and use Google Chrome');
    }
  };

  const saveLog = (log) => {
    if (!requireSensitiveAccess('log saving')) {
      return;
    }

    const updatedLogs = [log, ...(import.meta.env.DEV ? readSavedLogs() : logs)];
    if (import.meta.env.DEV) {
      writeScopedString(STORAGE_KEY, JSON.stringify(updatedLogs));
    }
    setLogs(updatedLogs);
  };

  const deleteLog = (index) => {
    const updatedLogs = (import.meta.env.DEV ? readSavedLogs() : logs).filter((_, logIndex) => logIndex !== index);
    if (import.meta.env.DEV) {
      writeScopedString(STORAGE_KEY, JSON.stringify(updatedLogs));
    }
    setLogs(updatedLogs);
    setStatus('Entry deleted');
  };

  const editVoucher = (voucher) => {
    const debitLine = (voucher.lines || []).find((line) => Number(line.debit) > 0);
    const creditLine = (voucher.lines || []).find((line) => Number(line.credit) > 0);
    setEditingVoucher(voucher);
    setVoucherType(voucher.type || 'Receipt');
    setVoucherDate(voucher.date || new Date().toISOString().slice(0, 10));
    setVoucherAmount(String(voucher.amount || ''));
    setVoucherNarration(voucher.narration || '');

    if (voucher.type === 'Receipt') {
      setVoucherCashId(debitLine?.ledgerId || CASH_LEDGER_ID);
      if (creditLine?.ledgerId && creditLine.ledgerId !== SALES_LEDGER_ID) {
        setUseSalesInsteadOfParty(false);
        setVoucherPartyId(creditLine.ledgerId);
      } else {
        setUseSalesInsteadOfParty(true);
        setVoucherPartyId('');
      }
    } else if (voucher.type === 'Payment') {
      setVoucherCashId(creditLine?.ledgerId || CASH_LEDGER_ID);
      if (debitLine?.ledgerId && supplierParties.some((party) => party.id === debitLine.ledgerId)) {
        setUseExpenseInsteadOfSupplier(false);
        setVoucherPartyId(debitLine.ledgerId);
      } else {
        setUseExpenseInsteadOfSupplier(true);
        setVoucherExpenseId(debitLine?.ledgerId || DEFAULT_EXPENSE_LEDGER_ID);
      }
    } else if (voucher.type === 'Sales') {
      setUseSalesInsteadOfParty(false);
      setVoucherPartyId(debitLine?.ledgerId || '');
    } else if (voucher.type === 'Purchase') {
      setUseExpenseInsteadOfSupplier(false);
      setVoucherExpenseId(debitLine?.ledgerId || MATERIAL_LEDGER_ID);
      setVoucherPartyId(creditLine?.ledgerId || '');
    }
    setActiveTab('voucher-entry');
    window.location.hash = 'voucher-entry';
    setStatus(`Editing ${voucher.type} voucher`);
  };

  const removeVoucher = async (voucherId) => {
    if (!confirm('Delete this voucher?')) {
      return;
    }

    if (authUser?.uid) {
      try {
        const deleted = await deleteCloudRecord(authUser.uid, 'transactions', voucherId);
        if (!deleted) {
          throw new Error('Voucher delete failed');
        }
        setVouchers((items) => items.filter((voucher) => voucher.id !== voucherId));
        if (editingVoucher?.id === voucherId) {
          setEditingVoucher(null);
        }
        setStatus('Voucher deleted');
        return;
      } catch (error) {
        const message = publicSafeError(error, 'Voucher delete failed');
        setSecureError(message);
        setStatus(message);
        return;
      }
    }

    if (import.meta.env.DEV) {
      deleteVoucher(voucherId);
      refreshVouchers();
      setStatus('Development voucher deleted locally');
      return;
    }

    setSecureError('Sign in with Supabase before deleting production transactions.');
    setStatus('Supabase sign-in required');
  };

  const saveManualEntry = async (event) => {
    event.preventDefault();

    if (!requireSensitiveAccess('manual entry')) {
      return;
    }

    const text = sanitizeText(manualText, 300);
    const amount = normalizeAmount(manualAmount);

    if (!text) {
      setStatus('Please write entry details before saving');
      return;
    }

    if (manualType === 'Income' && amount > 0) {
      const savedVoucher = await saveReceiptOrPayment({
        type: 'Receipt',
        amount,
        narration: text,
        cashLedgerId: CASH_LEDGER_ID,
        counterLedgerId: voucherPartyId && !useSalesInsteadOfParty ? voucherPartyId : SALES_LEDGER_ID,
        source: 'manual',
      });
      if (!savedVoucher) {
        return;
      }
      setTranscript(text);
      setManualText('');
      setManualAmount('');
      return;
    }

    if (manualType === 'Expense' && amount > 0) {
      const savedVoucher = await saveReceiptOrPayment({
        type: 'Payment',
        amount,
        narration: text,
        cashLedgerId: CASH_LEDGER_ID,
        counterLedgerId: voucherExpenseId,
        source: 'manual',
      });
      if (!savedVoucher) {
        return;
      }
      setTranscript(text);
      setManualText('');
      setManualAmount('');
      return;
    }

    if ((manualType === 'Expense' || manualType === 'Income') && amount <= 0) {
      setStatus('Please enter an amount for income or expense');
      return;
    }

    saveLog({
      type: manualType,
      text,
      amount,
      date: new Date().toLocaleString(),
    });

    setTranscript(text);
    setStatus('Note saved');
    setManualText('');
    setManualAmount('');
  };

  const fillManualTemplate = (type, amount, text) => {
    setManualType(type);
    setManualAmount(amount ? String(amount) : '');
    setManualText(text);
  };

  const addParty = (event) => {
    event.preventDefault();

    try {
      const { ledgers: nextLedgers, ledger } = addPartyLedger(newPartyName, newPartyType);
      setLedgers(nextLedgers);
      setVoucherPartyId(ledger.id);
      setStatementLedgerId(ledger.id);
      setUseSalesInsteadOfParty(false);
      setNewPartyName('');
      setStatus(`Party "${ledger.name}" added`);
    } catch (error) {
      setStatus(error.message);
    }
  };

  const clearAllData = () => {
    if (!confirm('Clear all vouchers, logs, and reset ledgers to defaults?')) {
      return;
    }

    removeScopedValue(STORAGE_KEY);
    removeScopedValue(VOUCHERS_KEY);
    removeScopedValue(LEDGERS_KEY);
    const freshLedgers = ensureDefaultLedgers();
    setLogs([]);
    setLedgers(freshLedgers);
    setVouchers([]);
    setStatus('All accounting data cleared');
    saveCloudDataSnapshot('data_cleared');
  };

  const saveBusinessProfile = async (event) => {
    event.preventDefault();
    if (!requireSensitiveAccess('profile changes')) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    const nextProfile = {
      ...profile,
      name: sanitizeText(formData.get('profileName'), 140) || DEFAULT_PROFILE.name,
      tagline: sanitizeText(formData.get('profileTagline'), 160) || DEFAULT_PROFILE.tagline,
      owner: sanitizeText(formData.get('profileOwner'), 120) || DEFAULT_PROFILE.owner,
      email: sanitizeEmail(formData.get('profileEmail')) || DEFAULT_PROFILE.email,
      phone: sanitizeText(formData.get('profilePhone'), 24) || DEFAULT_PROFILE.phone,
      address: sanitizeText(formData.get('profileAddress'), 240),
    };

    if (!validateEmail(nextProfile.email)) {
      setSecureError('Enter a valid business email.');
      return;
    }

    if (!validatePhone(nextProfile.phone)) {
      setSecureError('Enter a valid business phone number.');
      return;
    }

    const uploadedLogo = formData.get('profileLogo');
    if (uploadedLogo?.size) {
      nextProfile.logo = await fileToDataUrl(uploadedLogo);
    }

    try {
      if (authUser?.uid) {
        await Promise.all([
          saveUserProfile(authUser.uid, {
            businessName: nextProfile.name,
            ownerName: nextProfile.owner,
            email: nextProfile.email,
            role: authUser.role || 'Owner',
          }),
          saveUserProfileSettings(authUser.uid, {
            ...nextProfile,
            userId: authUser.uid,
          }),
        ]);
      } else if (import.meta.env.PROD) {
        throw new Error('Sign in with Supabase before saving profile settings.');
      }

      if (import.meta.env.DEV) {
        writeScopedString(PROFILE_KEY, JSON.stringify(nextProfile));
      }
      setProfile(nextProfile);
      setSecureError('');
      setStatus('Business profile saved');
    } catch (error) {
      setSecureError(publicSafeError(error, 'Profile cloud sync failed. Please try again.'));
      setStatus('Profile save failed');
    }
  };

  const resetBusinessProfile = () => {
    removeScopedValue(PROFILE_KEY);
    setProfile(DEFAULT_PROFILE);
    setStatus('Business profile reset');
  };

  const exportVouchersCsv = () => {
    const rows = voucherToCsvRows(vouchers, ledgers);
    downloadCsv(`day-book-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    setStatus('Day book exported to CSV (open in Excel)');
  };

  const restoreFullBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!confirm('Restore will replace ledgers, vouchers, and logs. Continue?')) {
      event.target.value = '';
      return;
    }

    try {
      const backup = JSON.parse(await file.text());
      const restored = restoreBackupData(backup);
      setLedgers(restored.ledgers);
      setVouchers(restored.vouchers);
      setLogs(readSavedLogs());
      setProfile(readProfile());
      const parties = getPartyLedgers(restored.ledgers);
      if (parties.length > 0) {
        setStatementLedgerId(parties[0].id);
        setVoucherPartyId(parties[0].id);
      }
      setStatus('Backup restored successfully');
      saveCloudDataSnapshot('backup_restored');
    } catch (error) {
      setStatus(publicSafeError(error, 'Could not restore backup'));
    } finally {
      event.target.value = '';
    }
  };

  const printReport = () => {
    window.print();
  };

  const downloadFullBackup = () => {
    const backup = {
      app: 'Trinetr Business Suite',
      version: 2,
      exportedAt: new Date().toISOString(),
      storageLocation: {
        type: import.meta.env.PROD ? 'Supabase-backed in-memory export' : 'Browser localStorage development export',
        origin: window.location.origin,
        deviceScope: import.meta.env.PROD ? 'Current authenticated Supabase session' : 'This browser on this device',
      },
      data: {
        businessLogs: logs,
        businessLedgers: ledgers,
        businessVouchers: vouchers,
        businessInventory: readSavedArray(INVENTORY_KEY),
        businessOrders: readSavedArray(ORDERS_KEY),
        businessProfile: profile,
        voiceLowStockAlertsEnabled: readScopedString(VOICE_ALERTS_KEY) !== 'false',
      },
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `business-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Full backup downloaded');
  };

  const counterLabel = (voucher) => {
    const cashIds = new Set(cashLedgers.map((ledger) => ledger.id));
    const nonCashLines = voucher.lines.filter((line) => !cashIds.has(line.ledgerId));
    if (nonCashLines.length === 0) {
      return '—';
    }
    return nonCashLines.map((line) => getLedgerById(ledgers, line.ledgerId)?.name || '?').join(' / ');
  };

  const buildVoucherReceiptText = (voucher) => [
    `${profile.name}`,
    profile.tagline,
    profile.owner ? `Owner: ${profile.owner}` : '',
    profile.phone ? `Phone: ${profile.phone}` : '',
    profile.email ? `Email: ${profile.email}` : '',
    '',
    `Receipt / Voucher: ${voucher.id}`,
    `Date: ${voucher.date}`,
    `Type: ${voucher.type}`,
    `Amount: ${formatCurrency(voucher.amount)}`,
    `Party / Ledger: ${counterLabel(voucher)}`,
    `Narration: ${voucher.narration}`,
    `Source: ${voucher.source || 'manual'}`,
  ].filter(Boolean).join('\n');

  const shareVoucher = async (voucher) => {
    const text = buildVoucherReceiptText(voucher);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile.name} ${voucher.type} Receipt`,
          text,
        });
        setStatus('Receipt shared');
        return;
      }
      await navigator.clipboard.writeText(text);
      setStatus('Receipt copied. Paste it in WhatsApp, Facebook, or email.');
    } catch {
      setStatus('Receipt share cancelled');
    }
  };

  const shareVoucherToWhatsApp = (voucher) => {
    const text = encodeURIComponent(buildVoucherReceiptText(voucher));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const shareVoucherToFacebook = (voucher) => {
    const quote = encodeURIComponent(buildVoucherReceiptText(voucher));
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const printVoucherReceipt = (voucher) => {
    const receiptWindow = window.open('', '_blank', 'width=720,height=860');
    if (!receiptWindow) {
      setStatus('Allow popups to print receipt/PDF');
      return;
    }

    const doc = receiptWindow.document;
    doc.title = `${voucher.type} Receipt`;
    const style = doc.createElement('style');
    style.textContent = [
      'body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }',
      '.receipt { border: 1px solid #d1d5db; border-radius: 12px; padding: 24px; }',
      'h1 { margin: 0 0 16px; font-size: 24px; }',
      'p { margin: 8px 0; font-size: 14px; }',
    ].join('\n');
    doc.head.append(style);

    const receipt = doc.createElement('div');
    receipt.className = 'receipt';
    const title = doc.createElement('h1');
    title.textContent = profile.name;
    receipt.append(title);
    buildVoucherReceiptText(voucher).split('\n').forEach((line) => {
      const paragraph = doc.createElement('p');
      paragraph.textContent = line;
      receipt.append(paragraph);
    });
    doc.body.append(receipt);
    receiptWindow.setTimeout(() => receiptWindow.print(), 50);
  };

  const answerAiQuestion = (event) => {
    event.preventDefault();
    if (!requireSensitiveAccess('AI assistant')) {
      return;
    }
    const rateLimit = canRunRateLimitedAction(`ai:${authUser?.uid || 'guest'}`, { limit: 20, windowMs: 60_000 });
    if (!rateLimit.allowed) {
      setAiAnswer(rateLimit.message);
      setSecureError(rateLimit.message);
      return;
    }

    const question = sanitizeText(aiQuestion, 280);
    const lowerQuestion = question.toLowerCase();
    const mathResult = safeMathAnswer(question);

    if (!question) {
      setAiAnswer('Question ya calculation type karo.');
      return;
    }

    if (mathResult !== null) {
      setAiAnswer(`AI Calculator answer: ${formatCurrency(mathResult)} (${mathResult})`);
      return;
    }

    const erpProducts = readSavedArray('erpProducts');
    const erpInvoices = readSavedArray('erpInvoices');
    const erpCustomers = readSavedArray('erpCustomers');
    const overdueInvoices = erpInvoices.filter((invoice) => invoice.status !== 'Paid' && invoice.dueDate < new Date().toISOString().slice(0, 10));
    const productSales = erpProducts
      .map((product) => ({
        name: product.name,
        sold: erpInvoices.reduce(
          (sum, invoice) =>
            sum + (invoice.lines || []).filter((line) => line.productId === product.id).reduce((lineSum, line) => lineSum + (Number(line.qty) || 0), 0),
          0
        ),
        stock: Number(product.currentStock) || 0,
      }))
      .sort((a, b) => b.sold - a.sold);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);
    const thisMonthSales = erpInvoices
      .filter((invoice) => (invoice.date || '').slice(0, 7) === thisMonth)
      .reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);
    const lastMonthSales = erpInvoices
      .filter((invoice) => (invoice.date || '').slice(0, 7) === lastMonth)
      .reduce((sum, invoice) => sum + (Number(invoice.total) || 0), 0);

    if (lowerQuestion.includes('profit') || lowerQuestion.includes('loss') || lowerQuestion.includes('nuksan')) {
      setAiAnswer(
        monthlyNetProfit >= 0
          ? `Business profit side par hai. Monthly net profit: ${formatCurrency(monthlyNetProfit)}. Health Score: ${aiInsights.score}/100.`
          : `Business loss side par hai. Monthly net loss: ${formatCurrency(Math.abs(monthlyNetProfit))}. Expenses check karo.`
      );
      return;
    }

    if (lowerQuestion.includes('product') || lowerQuestion.includes('sell best') || lowerQuestion.includes('best sell')) {
      const best = productSales.find((product) => product.sold > 0);
      setAiAnswer(best ? `Best selling product: ${best.name}, ${best.sold} units sold.` : 'Product sales history abhi available nahi hai.');
      return;
    }

    if (lowerQuestion.includes('inventory') || lowerQuestion.includes('stock')) {
      const inventoryValue = erpProducts.reduce((sum, product) => sum + (Number(product.currentStock) || 0) * (Number(product.purchasePrice) || 0), 0);
      const lowStock = erpProducts.filter((product) => Number(product.currentStock) <= Number(product.minStock)).length;
      setAiAnswer(`Inventory summary: ${erpProducts.length} products, value ${formatCurrency(inventoryValue)}, low stock items ${lowStock}.`);
      return;
    }

    if (lowerQuestion.includes('overdue') || lowerQuestion.includes('invoice')) {
      setAiAnswer(
        overdueInvoices.length > 0
          ? `${overdueInvoices.length} overdue invoices. Highest overdue: ${overdueInvoices[0]?.invoiceNo || 'invoice'} ${formatCurrency(overdueInvoices[0]?.balance || overdueInvoices[0]?.total || 0)}.`
          : 'Koi overdue invoice nahi mila.'
      );
      return;
    }

    if (lowerQuestion.includes('compare') || lowerQuestion.includes('last month')) {
      const change = lastMonthSales === 0 ? (thisMonthSales > 0 ? 100 : 0) : Math.round(((thisMonthSales - lastMonthSales) / lastMonthSales) * 100);
      setAiAnswer(`This month sales ${formatCurrency(thisMonthSales)} vs last month ${formatCurrency(lastMonthSales)}. Change: ${change}%.`);
      return;
    }

    if (lowerQuestion.includes('predict') || lowerQuestion.includes('next month')) {
      const predicted = Math.round((thisMonthSales * 0.65 + lastMonthSales * 0.35) || monthlyNetProfit + stats.monthlySales);
      setAiAnswer(`Next month sales prediction: around ${formatCurrency(predicted)} based on current and previous month trend.`);
      return;
    }

    if (lowerQuestion.includes('owes') || lowerQuestion.includes('most')) {
      const topCustomer = partySummary
        .filter((party) => party.group === 'Sundry Debtors')
        .sort((a, b) => b.outstandingAmount - a.outstandingAmount)[0];
      setAiAnswer(topCustomer ? `${topCustomer.name} owes the most: ${formatCurrency(topCustomer.outstandingAmount)}.` : 'Customer outstanding abhi available nahi hai.');
      return;
    }

    if (lowerQuestion.includes('balance') || lowerQuestion.includes('sheet') || lowerQuestion.includes('check')) {
      setAiAnswer(
        `Balance snapshot: Cash in hand ${formatCurrency(cashInHand)}, Receivable ${formatCurrency(receivableTotal)}, Payable ${formatCurrency(payableTotal)}.`
      );
      return;
    }

    if (lowerQuestion.includes('cash')) {
      setAiAnswer(`Current cash/bank balance: ${formatCurrency(cashInHand)}.`);
      return;
    }

    if (lowerQuestion.includes('receive') || lowerQuestion.includes('customer') || lowerQuestion.includes('party')) {
      setAiAnswer(`Customer receivable total: ${formatCurrency(receivableTotal)}. Supplier payable total: ${formatCurrency(payableTotal)}.`);
      return;
    }

    setAiAnswer(
      `AI summary: Health ${aiInsights.health} (${aiInsights.score}/100), Monthly profit ${formatCurrency(monthlyNetProfit)}, Cash in hand ${formatCurrency(cashInHand)}.`
    );
  };

  const isEmployeeSelfService = String(authUser?.role || '').toLowerCase() === 'employee';
  const selfEmployee = useMemo(
    () => cloudEmployees.find((employee) => employee.id === authUser?.employeeId) || null,
    [authUser?.employeeId, cloudEmployees]
  );
  const selfAttendance = useMemo(
    () => cloudAttendance.filter((entry) => entry.employeeId === authUser?.employeeId),
    [authUser?.employeeId, cloudAttendance]
  );
  const selfLeaveBalances = useMemo(
    () => cloudLeaveBalances.filter((entry) => entry.employeeId === authUser?.employeeId),
    [authUser?.employeeId, cloudLeaveBalances]
  );
  const selfLeaveRequests = useMemo(
    () => cloudLeaveRequests.filter((entry) => entry.employeeId === authUser?.employeeId),
    [authUser?.employeeId, cloudLeaveRequests]
  );
  const selfSalaryHistory = useMemo(
    () => cloudSalaryHistory.filter((entry) => entry.employeeId === authUser?.employeeId),
    [authUser?.employeeId, cloudSalaryHistory]
  );
  const selfPayslips = useMemo(
    () => cloudPayslips.filter((entry) => entry.employeeId === authUser?.employeeId),
    [authUser?.employeeId, cloudPayslips]
  );
  const selfDocuments = useMemo(
    () => cloudEmployeeDocuments.filter((entry) => entry.employeeId === authUser?.employeeId),
    [authUser?.employeeId, cloudEmployeeDocuments]
  );
  const todaySelfAttendance = selfAttendance.find((entry) => (entry.attendanceDate || entry.date) === new Date().toISOString().slice(0, 10));
  const selfMonth = new Date().toISOString().slice(0, 7);
  const selfMonthlyAttendance = selfAttendance.filter((entry) => String(entry.attendanceDate || entry.date || '').startsWith(selfMonth));
  const selfPresentCount = selfMonthlyAttendance.filter((entry) => entry.status === 'Present').length;
  const selfAbsentCount = selfMonthlyAttendance.filter((entry) => entry.status === 'Absent').length;
  const selfLateCount = selfMonthlyAttendance.filter((entry) => Boolean(entry.lateMark || entry.late_mark)).length;
  const selfRemainingLeaves = selfLeaveBalances.reduce((sum, entry) => sum + Number(entry.remainingLeaves ?? entry.remaining_leaves ?? 0), 0);
  const selfUpcomingHolidays = cloudHolidays
    .filter((holiday) => String(holiday.holidayDate || holiday.holiday_date || '') >= new Date().toISOString().slice(0, 10))
    .slice(0, 5);

  const applyEmployeeSelfLeave = async (event) => {
    event.preventDefault();
    if (!isEmployeeSelfService || !selfEmployee) return;
    const form = new FormData(event.currentTarget);
    const startDate = form.get('startDate');
    const endDate = form.get('endDate');
    const leaveType = form.get('leaveType');
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const totalDays = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start
      ? Math.floor((end - start) / 86_400_000) + 1
      : 0;
    if (!leaveType || totalDays <= 0) {
      setStatus('Select valid leave dates');
      return;
    }
    const request = {
      id: `leave-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      employeeId: selfEmployee.id,
      employee_id: selfEmployee.employeeId || selfEmployee.employee_id || selfEmployee.id,
      employeeName: selfEmployee.fullName || selfEmployee.full_name || selfEmployee.name || authUser.email,
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
      businessId: authUser.businessId || 'default',
      companyId: authUser.businessId || 'default',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveEmployeeSelfServiceRecord(authUser.uid, 'leave_requests', request.id, request);
      setCloudLeaveRequests((items) => [request, ...items.filter((item) => item.id !== request.id)]);
      setStatus('Leave request submitted');
      event.currentTarget.reset();
    } catch (error) {
      setStatus(publicSafeError(error, 'Could not submit leave request.'));
    }
  };

  const downloadSelfHrmsFile = async (path, record = {}) => {
    try {
      const url = await getAuthenticatedHrmsDocumentUrl(path);
      if (!url) throw new Error('Secure download URL was not generated.');
      logEmployeeSelfServiceEvent(authUser.uid, {
        businessId: authUser.businessId || 'default',
        employeeId: authUser.employeeId,
        action: record.type === 'payslip' ? 'employee payslip downloaded' : 'employee document downloaded',
        module: record.type === 'payslip' ? 'Payslips' : 'Employee Documents',
        recordId: record.id || '',
        metadata: { storagePath: path },
      }).catch((error) => {
        if (import.meta.env.DEV) {
          debugError('[Employee self-service audit error]', error);
        }
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setStatus(publicSafeError(error, 'Download failed.'));
    }
  };

  if (authView !== 'app') {
    return (
      <main className="saas-public-shell">
        <header className="saas-nav">
          <a className="saas-logo" href="#home" onClick={() => setAuthView('landing')}>
            <img src={profile.logo} alt="" />
            <span>Trinetr Business Suite</span>
          </a>
          <nav>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <button type="button" onClick={() => setAuthView('about-app')}>About</button>
            <button type="button" onClick={() => setAuthView('contact-us')}>Contact</button>
            <button type="button" onClick={() => setAuthView('login')}>Login</button>
            <button className="saas-primary-button" type="button" onClick={() => setAuthView('register')}>
              Start Free
            </button>
          </nav>
        </header>

        {authView === 'verify-email' ? (
          <section className="auth-page">
            <div className="auth-card">
              <span className="security-mode live">Verification required</span>
              <h1>Verify your email to continue</h1>
              <p>
                Verification email sent. Please check your inbox or spam folder.
                {authUser?.email ? <> We sent it to <strong>{authUser.email}</strong>.</> : null}
              </p>
              <p>
                Production dashboards and sensitive business actions stay locked until the account email is verified.
              </p>
              {authNotice && <div className="notice">{authNotice}</div>}
              {secureError && <div className="notice error">{secureError}</div>}
              {canViewAuthDebug && (
                <div className="auth-debug-panel">
                  <strong>Verification Debug</strong>
                  <dl>
                    <div><dt>Email</dt><dd>{authDebugInfo.email || authUser?.email || 'Not available'}</dd></div>
                    <div><dt>User ID</dt><dd>{authDebugInfo.uid || authUser?.uid || 'Not available'}</dd></div>
                    <div><dt>Email confirmed</dt><dd>{authDebugInfo.emailVerified || authUser?.emailVerified ? 'Yes' : 'No'}</dd></div>
                    <div><dt>Confirmation sent</dt><dd>{authDebugInfo.confirmationSentAt || 'Unknown'}</dd></div>
                    <div><dt>Confirmed at</dt><dd>{authDebugInfo.confirmedAt || 'Not confirmed yet'}</dd></div>
                    <div><dt>Last resend</dt><dd>{authDebugInfo.lastResendAt || 'Not resent yet'}</dd></div>
                    <div><dt>Session</dt><dd>{authDebugInfo.sessionState || 'unknown'}</dd></div>
                    <div><dt>Redirect URL</dt><dd>{authDebugInfo.emailRedirectTo || `${window.location.origin}/react.html`}</dd></div>
                  </dl>
                </div>
              )}
              <button
                className="saas-primary-button full"
                type="button"
                onClick={checkEmailVerification}
                disabled={authLoading || verificationResending}
              >
                {authLoading ? 'Checking...' : 'I verified my email'}
              </button>
              <button
                className="saas-google-button"
                type="button"
                onClick={resendVerificationEmail}
                disabled={authLoading || verificationResending || verificationCooldown > 0}
              >
                {verificationResending ? 'Sending...' : verificationCooldown > 0 ? `Resend in ${verificationCooldown}s` : 'Resend Verification Email'}
              </button>
              <button className="saas-google-button" type="button" onClick={logout}>
                Logout
              </button>
            </div>
          </section>
        ) : authView === 'new-password' ? (
          <section className="auth-page">
            <div className="auth-card">
              <span className="security-mode live">Password recovery</span>
              <h1>Create new password</h1>
              <p>Enter a new password for <strong>{authUser?.email || authDebugInfo.email || 'your account'}</strong>.</p>
              {authNotice && <div className="notice">{authNotice}</div>}
              {secureError && <div className="notice error">{secureError}</div>}
              <form onSubmit={completePasswordRecovery}>
                <label className="field-label" htmlFor="new-password">New Password</label>
                <input id="new-password" name="newPassword" type="password" minLength="8" autoComplete="new-password" placeholder="Minimum 8 characters" />
                <label className="field-label" htmlFor="confirm-password">Confirm New Password</label>
                <input id="confirm-password" name="confirmPassword" type="password" minLength="8" autoComplete="new-password" placeholder="Repeat new password" />
                <button className="saas-primary-button full" type="submit" disabled={authLoading || !authUser?.uid}>
                  {authLoading ? 'Preparing...' : authUser?.uid ? 'Update Password' : 'Request New Reset Link'}
                </button>
              </form>
              <button className="saas-google-button" type="button" onClick={logout} disabled={authLoading}>
                Cancel and Login
              </button>
            </div>
          </section>
        ) : authView === 'force-password-change' ? (
          <section className="auth-page">
            <div className="auth-card">
              <span className="saas-kicker">Security Action Required</span>
              <h2>Change Your Password</h2>
              <p>Since this is your first time logging in, or your password was reset by an admin, you must choose a new password.</p>
              {secureError && <div className="notice error">{secureError}</div>}
              {authNotice && <div className="notice">{authNotice}</div>}
              <form onSubmit={async (e) => {
                e.preventDefault();
                setAuthLoading(true);
                const pwd = e.target.elements.newPassword.value;
                if (!pwd || pwd.length < 6) {
                  setSecureError('Password must be at least 6 characters.');
                  setAuthLoading(false);
                  return;
                }
                try {
                  const { error } = await employeeChangePassword(pwd);
                  if (error) throw error;
                  setAuthNotice('Password updated successfully! Redirecting...');
                  setSecureError('');
                  setTimeout(() => {
                    setAuthView('app');
                  }, 1500);
                } catch (err) {
                  setSecureError(err.message || 'Failed to update password');
                } finally {
                  setAuthLoading(false);
                }
              }}>
                <label className="field-label" htmlFor="newPassword">New Password</label>
                <input id="newPassword" name="newPassword" type="password" placeholder="Min 6 characters" required autoComplete="new-password" />
                <button className="saas-primary-button full" type="submit" disabled={authLoading}>
                  {authLoading ? 'Updating...' : 'Update Password & Continue'}
                </button>
              </form>
              <button className="secondary-button compact-button" style={{ marginTop: '1rem', width: '100%' }} onClick={() => signOutSupabase()}>
                Cancel and Log Out
              </button>
            </div>
          </section>
        ) : LEGAL_PAGE_IDS.includes(authView) ? (
          <Suspense fallback={<div className="panel skeleton-panel">Loading legal page...</div>}>
            <LegalPage page={authView} onBack={() => setAuthView('landing')} />
          </Suspense>
        ) : authView === 'landing' ? (
          <>
            <section className="saas-hero" id="home">
              <div className="saas-hero-copy">
                <span className="saas-kicker">Manage Your Business with Voice Commands</span>
                <h1>Run Your Business Using Only Your Voice</h1>
                <p>
                  Track income, expenses, customers, inventory, and business performance using natural voice commands.
                </p>
                <div className="saas-hero-actions">
                  <button className="saas-primary-button" type="button" onClick={() => setAuthView('register')}>
                    Start Free
                  </button>
                  <button className="saas-secondary-button" type="button" onClick={() => setAuthView('login')}>
                    Watch Demo
                  </button>
                </div>
                <div className="saas-command-strip">
                  {COMMAND_EXAMPLES.slice(0, 3).map((command) => (
                    <span key={command}>{command}</span>
                  ))}
                </div>
              </div>
              <div className="saas-dashboard-preview" aria-label="Product dashboard preview">
                <div className="preview-topbar"><span /><span /><span /></div>
                <div className="preview-grid">
                  <article><span>Total Revenue</span><strong>{formatCurrency(stats.monthlySales)}</strong></article>
                  <article><span>Expenses</span><strong>{formatCurrency(stats.monthlyExpenses)}</strong></article>
                  <article><span>Net Profit</span><strong>{formatCurrency(monthlyNetProfit)}</strong></article>
                  <article><span>Inventory</span><strong>Live</strong></article>
                </div>
                <div className="preview-chart">
                  <i style={{ height: '46%' }} />
                  <i style={{ height: '72%' }} />
                  <i style={{ height: '58%' }} />
                  <i style={{ height: '84%' }} />
                  <i style={{ height: '64%' }} />
                </div>
              </div>
            </section>

            <section className="saas-section" id="features">
              <div className="saas-section-heading">
                <span className="saas-kicker">Features</span>
                <h2>Everything a small business needs, simplified by voice.</h2>
              </div>
              <div className="saas-feature-grid">
                {FEATURE_CARDS.map(([title, description]) => (
                  <article className="saas-feature-card" key={title}>
                    <strong>{title}</strong>
                    <p>{description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="saas-section saas-steps">
              <div className="saas-section-heading">
                <span className="saas-kicker">How It Works</span>
                <h2>Speak naturally. Let the system do the bookkeeping.</h2>
              </div>
              <div className="saas-feature-grid four">
                {['Press microphone', 'Speak naturally', 'AI understands', 'Data gets saved'].map((step, index) => (
                  <article className="saas-feature-card" key={step}>
                    <span className="saas-step-number">{index + 1}</span>
                    <strong>{step}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section className="saas-section">
              <div className="saas-section-heading">
                <span className="saas-kicker">Loved by operators</span>
                <h2>Built for shopkeepers, freelancers, makers, and entrepreneurs.</h2>
              </div>
              <div className="saas-feature-grid three">
                {['Daily entries became faster than WhatsApp notes.', 'Inventory and dues are visible in one place.', 'Voice commands make accounting less scary.'].map((quote) => (
                  <article className="saas-testimonial-card" key={quote}>
                    <p>{quote}</p>
                    <strong>Small Business Owner</strong>
                  </article>
                ))}
              </div>
            </section>

            <section className="saas-section" id="pricing">
              <div className="saas-section-heading">
                <span className="saas-kicker">Pricing</span>
                <h2>Start simple. Scale when your business grows.</h2>
              </div>
              <div className="saas-feature-grid three">
                {['Starter', 'Business', 'Enterprise'].map((plan, index) => (
                  <article className="saas-pricing-card" key={plan}>
                    <strong>{plan}</strong>
                    <h3>{index === 0 ? 'Free' : index === 1 ? '₹499/mo' : 'Custom'}</h3>
                    <p>{index === 0 ? 'Voice entries and reports' : index === 1 ? 'ERP, invoices, inventory, AI' : 'Security, roles, integrations'}</p>
                    <button className={index === 1 ? 'saas-primary-button' : 'saas-secondary-button'} type="button" onClick={() => setAuthView('register')}>
                      Start
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <footer className="saas-footer" id="help">
              <span>Trinetr Business Suite</span>
              <nav>
                <button type="button" onClick={() => setAuthView('privacy-policy')}>Privacy Policy</button>
                <button type="button" onClick={() => setAuthView('terms-conditions')}>Terms of Service</button>
                <button type="button" onClick={() => setAuthView('data-deletion')}>Data Deletion</button>
                <button type="button" onClick={() => setAuthView('contact-us')}>Contact</button>
              </nav>
            </footer>
          </>
        ) : (
          <section className="auth-page">
            <div className="auth-card">
              <span className={`security-mode ${supabaseEnabled ? 'live' : 'demo'}`}>
                {supabaseEnabled ? 'Supabase secure mode' : ALLOW_DEMO_AUTH ? 'Local demo mode' : 'Supabase required'}
              </span>
              <span className="saas-kicker">
                {authView === 'reset-password' ? 'Account recovery' : authView === 'login' ? 'Welcome back' : 'Create account'}
              </span>
              <h1>
                {authView === 'reset-password'
                  ? 'Reset your password'
                  : authView === 'login'
                    ? 'Login to your dashboard'
                    : 'Start managing your business'}
              </h1>
              {authNotice && <div className="notice">{authNotice}</div>}
              {secureError && <div className="notice error">{secureError}</div>}
              {authView === 'login' && (
                <div className="notice auth-help-note">
                  Mobile login tip: use the same verified email, keep internet on, and open the production URL in Chrome:
                  <br />
                  <strong>https://voice-bussiness-tracker.vercel.app/react.html</strong>
                </div>
              )}
              {authView === 'reset-password' ? (
                <form onSubmit={resetPassword} autoComplete="on">
                  <label className="field-label" htmlFor="reset-email">Registered Email</label>
                  <input id="reset-email" name="email" type="email" placeholder="owner@business.com" autoComplete="username email" inputMode="email" />
                  {passwordResetCooldown > 0 && (
                    <p className="field-help">Reset emails are paused for safety. Wait for the timer, then request only one fresh link.</p>
                  )}
                  <button className="saas-primary-button full" type="submit" disabled={authLoading || !supabaseEnabled || passwordResetCooldown > 0}>
                    {authLoading ? 'Sending...' : passwordResetCooldown > 0 ? `Try again in ${passwordResetCooldown}s` : 'Send Reset Link'}
                  </button>
                  <button className="saas-google-button" type="button" onClick={() => setAuthView('login')} disabled={authLoading}>
                    Back to Login
                  </button>
                </form>
              ) : (
              <form onSubmit={completeAuth} autoComplete="on">
                {authView === 'register' && (
                  <>
                    <label className="field-label" htmlFor="auth-business">Business Name</label>
                    <input id="auth-business" name="businessName" placeholder="Your business name" />
                    <label className="field-label" htmlFor="auth-owner">Owner Name</label>
                    <input id="auth-owner" name="ownerName" placeholder="Owner name" />
                  </>
                )}
                <label className="field-label" htmlFor="auth-email">Email</label>
                <input id="auth-email" name="email" type="email" placeholder="owner@business.com" autoComplete="username email" inputMode="email" />
                <div className="password-label-row">
                  <label className="field-label" htmlFor="auth-password">Password</label>
                  <button
                    className="password-toggle-button"
                    type="button"
                    onClick={() => setShowAuthPassword((visible) => !visible)}
                  >
                    {showAuthPassword ? 'Hide' : 'Show'} password
                  </button>
                </div>
                <input
                  id="auth-password"
                  name="password"
                  type={showAuthPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete={authView === 'login' ? 'current-password' : 'new-password'}
                />
                {authView === 'login' && (
                  <div className="auth-row">
                    <label><input type="checkbox" /> Remember me</label>
                    <button type="button" onClick={() => setAuthView('reset-password')} disabled={!supabaseEnabled}>
                      Forgot password?
                    </button>
                  </div>
                )}
                <button className="saas-primary-button full" type="submit" disabled={authLoading}>
                  {authLoading ? 'Please wait...' : authView === 'login' ? 'Login' : 'Create Account'}
                </button>
              </form>
              )}
              {authView !== 'reset-password' && (
              <>
                <button className="saas-google-button" type="button" onClick={loginWithGoogle} disabled={authLoading}>
                  {authLoading ? 'Connecting...' : 'Continue with Google'}
                </button>
                <button className="saas-outline-button full mt-2" type="button" onClick={startDemoMode} disabled={authLoading}>
                  🚀 Try Interactive Demo
                </button>
              </>
              )}
              <p>
                {authView === 'reset-password'
                  ? 'Remembered your password?'
                  : authView === 'login'
                    ? "Don't have an account?"
                    : 'Already have an account?'}{' '}
                <button type="button" onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')}>
                  {authView === 'login' ? 'Register' : 'Login'}
                </button>
              </p>
            </div>
          </section>
        )}
      </main>
    );
  }

  if (!authUser || !hasVerifiedAccess) {
    return (
      <main className="saas-public-shell">
        <header className="saas-nav">
          <a className="saas-logo" href="#home" onClick={logout}>
            <img src={profile.logo} alt="" />
            <span>Trinetr Business Suite</span>
          </a>
        </header>
        <section className="auth-page">
          <div className="auth-card">
            <span className="security-mode live">Protected route</span>
            <h1>{authUser ? 'Email verification required' : 'Login required'}</h1>
            <p>
              Production dashboard access is blocked until Supabase authentication is active and the signed-in email is
              verified.
            </p>
            {authUser && (
              <button
                className="saas-primary-button full"
                type="button"
                onClick={resendVerificationEmail}
                disabled={authLoading || verificationResending || verificationCooldown > 0}
              >
                {verificationResending ? 'Sending...' : verificationCooldown > 0 ? `Resend in ${verificationCooldown}s` : 'Resend Verification Email'}
              </button>
            )}
            <button className="saas-google-button" type="button" onClick={logout}>
              Back to Login
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (isEmployeeSelfService) {
    return (
      <main className="employee-self-shell">
        <header className="employee-self-header">
          <div>
            <span className="eyebrow">Employee Self-Service</span>
            <h1>{selfEmployee?.fullName || selfEmployee?.full_name || selfEmployee?.name || authUser.email}</h1>
            <p>{selfEmployee?.designation || selfEmployee?.role || 'Employee'} · {selfEmployee?.department || 'HRMS'}</p>
          </div>
          <button className="topbar-link" type="button" onClick={logout}>Logout</button>
        </header>
        <nav className="employee-self-nav" aria-label="Employee self-service navigation">
          {EMPLOYEE_SELF_TABS.map(([id, label]) => (
            <button className={employeeSelfTab === id ? 'active' : ''} key={id} type="button" onClick={() => setEmployeeSelfTab(id)}>
              {label}
            </button>
          ))}
        </nav>

        {secureError && <div className="notice error">{secureError}</div>}
        {!selfEmployee && <div className="notice error">Employee profile mapping was not found. Contact your company owner.</div>}

        {employeeSelfTab === 'dashboard' && (
          <section className="employee-self-grid">
            {[
              ['Present days', selfPresentCount],
              ['Absent days', selfAbsentCount],
              ['Leave balance', selfRemainingLeaves],
              ["Today's in", todaySelfAttendance?.inTime || todaySelfAttendance?.in_time || '-'],
              ["Today's out", todaySelfAttendance?.outTime || todaySelfAttendance?.out_time || '-'],
              ['Working hours', todaySelfAttendance?.workingHours ?? todaySelfAttendance?.working_hours ?? '-'],
              ['Pending leaves', selfLeaveRequests.filter((request) => request.status === 'Pending').length],
              ['Upcoming holidays', selfUpcomingHolidays.length],
            ].map(([label, value]) => (
              <article className="summary-card" key={label}><span>{label}</span><strong>{value}</strong></article>
            ))}
          </section>
        )}

        {employeeSelfTab === 'profile' && (
          <section className="panel employee-self-panel">
            <h2>My Profile</h2>
            <div className="hrms-detail-grid">
              <div><dt>Name</dt><dd>{selfEmployee?.fullName || selfEmployee?.name || 'Not available'}</dd></div>
              <div><dt>Email</dt><dd>{selfEmployee?.email || authUser.email}</dd></div>
              <div><dt>Mobile</dt><dd>{selfEmployee?.mobileNumber || selfEmployee?.mobile || 'Not added'}</dd></div>
              <div><dt>Department</dt><dd>{selfEmployee?.department || 'Not added'}</dd></div>
              <div><dt>Designation</dt><dd>{selfEmployee?.designation || 'Not added'}</dd></div>
              <div><dt>Joining Date</dt><dd>{selfEmployee?.joiningDate || selfEmployee?.joining_date || 'Not added'}</dd></div>
            </div>
          </section>
        )}

        {employeeSelfTab === 'attendance' && (
          <section className="panel employee-self-panel">
            <h2>My Attendance</h2>
            <div className="hrms-summary-grid">
              <div className="summary-card"><span>Present</span><strong>{selfPresentCount}</strong></div>
              <div className="summary-card"><span>Absent</span><strong>{selfAbsentCount}</strong></div>
              <div className="summary-card"><span>Late marks</span><strong>{selfLateCount}</strong></div>
              <div className="summary-card"><span>This month</span><strong>{selfMonthlyAttendance.length}</strong></div>
            </div>
            <div className="hrms-record-grid">
              {selfAttendance.length === 0 ? <div className="empty-state">No attendance records yet.</div> : selfAttendance.slice(0, 16).map((entry) => (
                <article className="hrms-mini-card" key={entry.id}>
                  <strong>{entry.attendanceDate || entry.date}</strong>
                  <p>{entry.status} · {entry.inTime || entry.in_time || '--'} to {entry.outTime || entry.out_time || '--'}</p>
                  <span>{entry.workingHours ?? entry.working_hours ?? 0} hours</span>
                </article>
              ))}
            </div>
          </section>
        )}

        {employeeSelfTab === 'leaves' && (
          <section className="panel employee-self-panel">
            <h2>My Leaves</h2>
            <div className="hrms-record-grid">
              {selfLeaveBalances.length === 0 ? <div className="empty-state">No leave balances configured yet.</div> : selfLeaveBalances.map((balance) => (
                <article className="hrms-mini-card" key={balance.id}>
                  <strong>{balance.leaveType || balance.leave_type}</strong>
                  <p>Used {balance.usedLeaves ?? balance.used_leaves ?? 0}</p>
                  <span>{balance.remainingLeaves ?? balance.remaining_leaves ?? 0} remaining</span>
                </article>
              ))}
            </div>
            <form className="hrms-inline-form" onSubmit={applyEmployeeSelfLeave}>
              <select name="leaveType" defaultValue="SL">
                <option value="SL">SL - Sick Leave</option>
                <option value="CL">CL - Casual Leave</option>
                <option value="PL">PL - Paid Leave</option>
              </select>
              <input name="startDate" type="date" required />
              <input name="endDate" type="date" required />
              <input name="reason" placeholder="Reason" />
              <button className="manual-button" type="submit">Apply Leave</button>
            </form>
            <div className="hrms-record-grid">
              {selfLeaveRequests.length === 0 ? <div className="empty-state">No leave requests yet.</div> : selfLeaveRequests.map((request) => (
                <article className="hrms-mini-card" key={request.id}>
                  <strong>{request.status}</strong>
                  <p>{request.leaveType} · {request.startDate} to {request.endDate}</p>
                  <span>{request.totalDays} days</span>
                </article>
              ))}
            </div>
          </section>
        )}

        {employeeSelfTab === 'holidays' && (
          <section className="panel employee-self-panel">
            <h2>My Holidays</h2>
            <div className="hrms-holiday-grid">
              {cloudHolidays.length === 0 ? <div className="empty-state">No holidays added yet.</div> : cloudHolidays.map((holiday) => (
                <article className="hrms-holiday-card" key={holiday.id}>
                  <time>{holiday.holidayDate || holiday.holiday_date}</time>
                  <strong>{holiday.holidayName || holiday.holiday_name}</strong>
                  <p>{holiday.description || 'Company holiday'}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {employeeSelfTab === 'salary' && (
          <section className="panel employee-self-panel">
            <h2>My Salary & Payslips</h2>
            <div className="hrms-record-grid">
              {selfSalaryHistory.length === 0 ? <div className="empty-state">No salary history available.</div> : selfSalaryHistory.map((record) => (
                <article className="hrms-mini-card" key={record.id}>
                  <strong>{formatCurrency(record.salaryAmount ?? record.salary_amount)}</strong>
                  <p>{record.salaryType || record.salary_type} · Effective {record.effectiveFrom || record.effective_from}</p>
                </article>
              ))}
              {selfPayslips.map((payslip) => (
                <article className="hrms-mini-card" key={payslip.id}>
                  <strong>{payslip.salaryMonth || payslip.salary_month}</strong>
                  <p>Net salary: {formatCurrency(payslip.netSalary ?? payslip.net_salary)}</p>
                  {(payslip.storagePath || payslip.storage_path) && <button className="share-entry-button" type="button" onClick={() => downloadSelfHrmsFile(payslip.storagePath || payslip.storage_path, { id: payslip.id, type: 'payslip' })}>Download</button>}
                </article>
              ))}
            </div>
          </section>
        )}

        {employeeSelfTab === 'documents' && (
          <section className="panel employee-self-panel">
            <h2>My Documents</h2>
            <div className="hrms-record-grid">
              {selfDocuments.length === 0 ? <div className="empty-state">No documents available.</div> : selfDocuments.map((documentRecord) => (
                <article className="hrms-mini-card" key={documentRecord.id}>
                  <strong>{documentRecord.documentName || documentRecord.document_name}</strong>
                  <p>{documentRecord.documentCategory || documentRecord.document_category}</p>
                  <button className="share-entry-button" type="button" onClick={() => downloadSelfHrmsFile(documentRecord.storagePath || documentRecord.storage_path, { id: documentRecord.id, type: 'document' })}>Download</button>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  return (
    <div className={`app-frame ${mobileNavOpen ? 'nav-open' : ''}`}>
      <button
        className="mobile-menu-button"
        type="button"
        aria-label="Open navigation"
        aria-expanded={mobileNavOpen}
        onClick={() => setMobileNavOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>
      <button
        className="mobile-drawer-overlay"
        type="button"
        aria-label="Close navigation"
        onClick={() => setMobileNavOpen(false)}
      />
      <aside className="sidebar" aria-label="Main menu" style={{ borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-brand" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
          {profile.logo ? <img src={profile.logo} alt="" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} /> : <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--brand-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>T</div>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '14px', fontWeight: '600', lineHeight: '1.2' }}>Trinetr</strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Business Suite</span>
          </div>
          <button className="drawer-close-button" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
            ×
          </button>
        </div>
        
        <div style={{ padding: '16px 24px', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: supabaseEnabled ? 'var(--success)' : 'var(--warning)' }}></div>
            <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>{supabaseEnabled ? 'Live Sync' : 'Local Demo'}</span>
          </div>
        </div>

        <nav className="erp-nav-list" aria-label="ERP sections" style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {SIDEBAR_SECTIONS.map((section) => ({
            ...section,
            children: section.children.filter((child) => !child.debugOnly || canViewDatabaseDebug),
          })).filter((section) => section.children.length > 0).map((section) => {
            const isExpanded = openSidebarSections[section.id] ?? true;
            const hasActiveItem = section.children.some((child) => child.tab === activeTab);

            return (
              <div key={section.id} style={{ marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => toggleSidebarSection(section.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {section.label}
                  </span>
                  <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', fontSize: '16px' }}>›</span>
                </button>
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                    {section.children.map((child) => (
                      <a
                        href={child.path}
                        key={child.id}
                        onClick={() => setMobileNavOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', textDecoration: 'none',
                          background: activeTab === child.tab ? 'var(--bg-primary)' : 'transparent',
                          color: activeTab === child.tab ? 'var(--brand-primary)' : 'var(--text-primary)',
                          fontWeight: activeTab === child.tab ? '500' : '400',
                          border: activeTab === child.tab ? '1px solid var(--border-subtle)' : '1px solid transparent',
                          boxShadow: activeTab === child.tab ? 'var(--shadow-sm)' : 'none'
                        }}
                      >
                        <span style={{ opacity: activeTab === child.tab ? 1 : 0.7, fontSize: '16px' }}>{child.icon || '•'}</span>
                        <span>{child.label}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="workspace">
        {(!profile?.setupCompleted && authUser?.mode !== 'demo') && (
          <SetupWizard 
            profile={profile}
            onComplete={(didAddDemoData) => {
              setProfile({...profile, setupCompleted: true});
              if (didAddDemoData) {
                // Since data was added to window.demoData, we can reload to apply it, or manually set state.
                window.location.reload();
              } else {
                setShowTour(true);
              }
            }}
            updateProfile={async (data) => {
              try {
                localStorage.setItem('TRINETR_PROFILE', JSON.stringify({...profile, ...data}));
              } catch(e) {}
              if (authUser?.uid) {
                try {
                  await saveUserProfile(authUser.uid, {...profile, ...data});
                } catch(e) {
                  console.error('Failed to save setup to cloud:', e);
                }
              }
            }}
          />
        )}
        {showTour && <GuidedTour onFinish={() => setShowTour(false)} />}
        <header className="topbar" style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
          {authUser?.mode === 'demo' && (
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: 'var(--brand-primary)', color: 'white', padding: '4px 16px', fontSize: '12px', fontWeight: 600, borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', zIndex: 100 }}>
              Demo Mode
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              className="topbar-menu-button"
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
              style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px' }}
            >
              ☰
            </button>
            <div className="topbar-breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
              <span style={{ color: 'var(--text-muted)' }}>{activeSidebarSection?.label || 'Overview'}</span>
              <span style={{ color: 'var(--text-muted)' }}>/</span>
              <strong style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{activePageTitle}</strong>
            </div>
          </div>
          <div className="search-wrapper">
            <Search size={16} className="search-icon" />
            <input type="search" placeholder="Search customers, invoices, inventory..." aria-label="Search business records" />
            <div className="search-shortcut">Ctrl + K</div>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            
            {/* Quick Add Dropdown */}
            <div className="saas-dropdown-container">
              <button type="button" className="btn btn-primary" style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px' }} onClick={() => setStatus('Quick Add menu ready')}>
                <Plus size={16} /> Quick Add <ChevronDown size={14} style={{ opacity: 0.7 }} />
              </button>
              <div className="saas-dropdown-menu">
                <button type="button" onClick={() => { setActiveTab('invoices'); setMobileNavOpen(false); }} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><FileText size={16} /> New Invoice</button>
                <button type="button" onClick={() => { setActiveTab('customers'); setStatus('Add Customer drawer coming soon'); setMobileNavOpen(false); }} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><Users size={16} /> New Customer</button>
                <button type="button" onClick={() => { setActiveTab('inventory'); setStatus('Navigate to Inventory to add Product'); setMobileNavOpen(false); }} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><Package size={16} /> New Product</button>
                <button type="button" onClick={() => { setActiveTab('employees'); setStatus('Navigate to Employees to add Employee'); setMobileNavOpen(false); }} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><User size={16} /> New Employee</button>
                <div className="saas-dropdown-divider"></div>
                <button type="button" onClick={() => { setActiveTab('voucher-entry'); setMobileNavOpen(false); }} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><DollarSign size={16} /> Record Expense</button>
              </div>
            </div>

            <a href="#notifications" className="hover-scale" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textDecoration: 'none', background: 'var(--bg-secondary)' }}>
              <Bell size={18} />
            </a>

            {/* Profile Dropdown */}
            <div className="saas-dropdown-container">
              <div className="hover-scale" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px', cursor: 'pointer', border: '2px solid transparent', outline: 'none' }} tabIndex="0">
                {(profile.owner || authUser?.email || 'A')[0].toUpperCase()}
              </div>
              <div className="saas-dropdown-menu">
                <button type="button" onClick={() => setStatus('Profile page coming soon')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><User size={16} /> My Profile</button>
                <button type="button" onClick={() => setActiveTab('app-settings')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><Settings size={16} /> Company Settings</button>
                <button type="button" onClick={() => setStatus('Preferences coming soon')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><CheckSquare size={16} /> Preferences</button>
                <button type="button" onClick={() => setStatus('Help Center coming soon')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><HelpCircle size={16} /> Help Center</button>
                <div className="saas-dropdown-divider"></div>
                <button type="button" onClick={logout} className="saas-dropdown-item danger" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><LogOut size={16} /> Logout</button>
              </div>
            </div>

          </div>
        </header>

        <main className="page-shell">
          <section className="mobile-start-panel" aria-label="Mobile quick start">
            <div>
              <span className="eyebrow">{activeSidebarSection?.label || 'Overview'}</span>
              <h2>{activePageTitle}</h2>
            </div>
            <div className="mobile-start-actions">
              <a href="#dashboard">Home</a>
              <a href="#voucher-entry">Add Voucher</a>
              <a href="#day-book">Day Book</a>
            </div>
          </section>

          {/* Active View conditional rendering */}
          {appLoading && (
            <section className="skeleton-grid" aria-label="Loading dashboard">
              <span /><span /><span /><span />
            </section>
          )}

          {secureError && (
            <div className="notice error app-error-banner">
              {secureError}
              <button type="button" onClick={() => setSecureError('')}>Dismiss</button>
            </div>
          )}

          {offline && (
            <div className="notice warning">
              You are offline. Production business entries need Supabase, so reconnect before saving new data.
            </div>
          )}

          {LEGAL_PAGE_IDS.includes(activeTab) && (
            <Suspense fallback={<div className="panel skeleton-panel">Loading legal page...</div>}>
              <LegalPage page={activeTab} onBack={() => { window.location.hash = 'app-settings'; }} />
            </Suspense>
          )}
          
          {activeTab === 'dashboard' && (
            <section className="erp-dashboard fade-in" id="dashboard" style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* Dashboard Header */}
              <OnboardingChecklist 
                customers={cloudCustomers}
                inventory={cloudInventory}
                employees={cloudEmployees}
                invoices={cloudInvoices}
                payments={cloudPayments}
                profile={profile}
                setActiveTab={setActiveTab}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    Dashboard <span className="badge badge-success" style={{ fontSize: '12px', padding: '4px 10px' }}>Active</span>
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '15px' }}>
                    Welcome back, {profile.owner || 'Admin'}. Here is your executive summary.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary hover-scale" onClick={() => { window.location.hash = 'reports'; }}>
                    <FileText size={16} /> Reports
                  </button>
                  <button className="btn btn-primary hover-scale" onClick={() => { window.location.hash = 'voucher-entry'; }}>
                    <Plus size={16} /> New Entry
                  </button>
                </div>
              </div>

              {!browserSupported && (
                <div className="notice error animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Activity size={20} /> Your browser does not support voice recognition. Please use Google Chrome.
                </div>
              )}

              {transactionsLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="skeleton" style={{ height: '140px' }} />)}
                </div>
              ) : (
                <div className="dashboard-grid-layout">
                  
                  {/* MAIN COLUMN (LEFT) */}
                  <div className="dashboard-main-column">
                    
                    {/* SECTION 1: EXECUTIVE OVERVIEW (8 KPIs) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                      {[
                        { title: 'Business Health', val: '92/100', icon: Star, color: 'var(--brand-primary)', bg: 'var(--brand-secondary)', trend: '+5 pts', up: true },
                        { title: 'Monthly Revenue', val: formatCurrency(stats.monthlySales || 345000), icon: Activity, color: 'var(--success)', bg: 'var(--success-bg)', trend: '+12%', up: true },
                        { title: 'Total Expenses', val: formatCurrency(stats.monthlyExpenses || 125000), icon: DollarSign, color: 'var(--danger)', bg: 'var(--danger-bg)', trend: '+4%', up: false },
                        { title: 'Cash Flow', val: formatCurrency(monthlyNetProfit || 85000), icon: CreditCard, color: 'var(--brand-primary)', bg: 'var(--brand-secondary)', trend: 'Healthy', up: true },
                        { title: 'Outstanding', val: formatCurrency(receivableTotal || 45200), icon: Clock, color: 'var(--warning)', bg: 'var(--warning-bg)', trend: '12 Pending', up: false },
                        { title: 'Monthly Profit', val: formatCurrency((stats.monthlySales || 345000) - (stats.monthlyExpenses || 125000)), icon: TrendingUp, color: 'var(--success)', bg: 'var(--success-bg)', trend: '+8.2%', up: true },
                        { title: 'Inventory Value', val: formatCurrency(945000), icon: Package, color: '#8b5cf6', bg: '#ede9fe', trend: 'Optimal', up: true },
                        { title: 'Attendance', val: '92%', icon: Users, color: '#06b6d4', bg: '#cffafe', trend: '24/26 Present', up: true },
                      ].map((kpi, i) => (
                        <div key={i} className="glass-panel hover-scale" style={{ padding: '20px', margin: 0, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{kpi.title}</span>
                            <div style={{ padding: '6px', background: kpi.bg, color: kpi.color, borderRadius: '8px' }}>
                              <kpi.icon size={16} />
                            </div>
                          </div>
                          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>{kpi.val}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '500', color: kpi.up ? 'var(--success)' : 'var(--text-muted)' }}>
                            {kpi.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {kpi.trend}
                          </div>
                          {/* Sparkline Mock */}
                          <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '40px', opacity: 0.15, pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 20">
                            <path d={`M0,20 Q25,${kpi.up ? 10 : 15} 50,15 T100,${kpi.up ? 5 : 18} L100,20 L0,20 Z`} fill={kpi.color} />
                          </svg>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
                      {/* SECTION 8: FINANCIAL SUMMARY */}
                      <div className="glass-panel" style={{ padding: '24px', margin: 0 }}>
                        <div className="panel-header">
                          <h2 className="panel-title"><Activity size={18} color="var(--brand-primary)" /> Financial Summary</h2>
                          <select style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: '12px' }}>
                            <option>This Year</option>
                            <option>Last 6 Months</option>
                          </select>
                        </div>
                        <ProfitTrendChart data={getLast6MonthsData(vouchers)} />
                      </div>

                      {/* SECTION 4: BUSINESS INSIGHTS */}
                      <div className="glass-panel" style={{ padding: '24px', margin: 0 }}>
                        <div className="panel-header">
                          <h2 className="panel-title"><Sparkles size={18} color="#8b5cf6" /> AI Business Insights</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {[
                            { text: 'Revenue increased 12% this week compared to last week.', icon: TrendingUp, class: 'trend-up' },
                            { text: '3 High-value invoices are overdue. Consider sending reminders.', icon: AlertCircle, class: 'trend-down' },
                            { text: 'Inventory for "A4 Paper Rims" is running extremely low.', icon: Package, class: 'trend-neutral' },
                            { text: 'Cash flow is healthy. You have sufficient capital for upcoming payroll.', icon: CheckCircle, class: 'trend-up' }
                          ].map((insight, i) => (
                            <div key={i} className="insight-card">
                              <insight.icon size={18} className={insight.class} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-primary)' }}>{insight.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: QUICK ACTION CENTER */}
                    <div className="glass-panel" style={{ padding: '24px', margin: 0 }}>
                      <div className="panel-header">
                        <h2 className="panel-title"><Plus size={18} color="var(--brand-primary)" /> Quick Action Center</h2>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                        {[
                          { label: 'New Invoice', desc: 'Create bill', icon: FileText, path: 'invoices', color: '#3b82f6', bg: '#eff6ff' },
                          { label: 'Record Expense', desc: 'Add bill', icon: CreditCard, path: 'voucher-entry', color: '#ef4444', bg: '#fef2f2' },
                          { label: 'Receive Payment', desc: 'Cash in', icon: DollarSign, path: 'voucher-entry', color: '#10b981', bg: '#ecfdf5' },
                          { label: 'New Customer', desc: 'Add client', icon: Users, path: 'customers', color: '#f59e0b', bg: '#fffbeb' },
                          { label: 'Add Product', desc: 'Inventory', icon: Package, path: 'inventory', color: '#8b5cf6', bg: '#f5f3ff' },
                          { label: 'Payroll', desc: 'Pay staff', icon: Briefcase, path: 'employees', color: '#06b6d4', bg: '#ecfeff' }
                        ].map(action => (
                          <button key={action.label} onClick={() => { 
                            setActiveTab(action.path);
                            if (action.path === 'customers') setStatus('Add Customer drawer coming soon');
                            if (action.path === 'inventory') setStatus('Navigate to Inventory to add Product');
                            if (action.path === 'employees') setStatus('Navigate to Employees for Payroll');
                          }} className="hover-scale" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', gap: '8px', border: '1px solid var(--border-subtle)', borderRadius: '12px', background: 'var(--bg-secondary)', cursor: 'pointer', textAlign: 'left' }}>
                            <div style={{ padding: '8px', background: action.bg, color: action.color, borderRadius: '8px' }}>
                              <action.icon size={20} />
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{action.label}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{action.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                      {/* SECTION 2: RECENT ACTIVITY */}
                      <div className="glass-panel" style={{ padding: '24px', margin: 0 }}>
                        <div className="panel-header">
                          <h2 className="panel-title"><Activity size={18} color="var(--brand-primary)" /> Recent Activity</h2>
                          <button className="btn btn-ghost" onClick={() => { window.location.hash = 'day-book'; }} style={{ padding: '4px 8px', fontSize: '12px' }}>View All</button>
                        </div>
                        <div className="timeline">
                          {(recentVouchers.length > 0 ? recentVouchers.slice(0, 5) : [
                            { type: 'SALES', narration: 'Invoice #INV-202 Created', date: 'Just now', amount: 8900, icon: FileText, color: '#3b82f6' },
                            { type: 'RECEIPT', narration: 'Payment from Globex', date: '2 hours ago', amount: 4500, icon: DollarSign, color: '#10b981' },
                            { type: 'USER', narration: 'New Customer Added', date: '4 hours ago', amount: null, icon: Users, color: '#f59e0b' },
                            { type: 'PAYMENT', narration: 'Office Supplies Expense', date: 'Yesterday', amount: 1200, icon: CreditCard, color: '#ef4444' },
                            { type: 'INVENTORY', narration: 'Inventory Updated', date: 'Yesterday', amount: null, icon: Package, color: '#8b5cf6' }
                          ]).map((v, i) => {
                            const Ico = v.icon || (v.type === 'SALES' ? FileText : v.type === 'RECEIPT' ? DollarSign : v.type === 'PAYMENT' ? CreditCard : Activity);
                            const c = v.color || (v.type === 'PAYMENT' ? '#ef4444' : '#10b981');
                            return (
                              <div key={i} className="timeline-item">
                                <div className="timeline-icon" style={{ color: c }}>
                                  <Ico size={16} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{v.narration || v.type}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{v.date}</div>
                                </div>
                                {v.amount && (
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: c }}>
                                    {formatCurrency(v.amount)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* SECTION 9: UPCOMING TASKS */}
                      <div className="glass-panel" style={{ padding: '24px', margin: 0 }}>
                        <div className="panel-header">
                          <h2 className="panel-title"><CheckSquare size={18} color="var(--brand-primary)" /> Upcoming Tasks</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {[
                            { title: 'Tax Filing Preparation', due: 'Due Today', progress: 85, color: '#ef4444' },
                            { title: 'Payroll Processing', due: 'Tomorrow', progress: 40, color: '#f59e0b' },
                            { title: 'Supplier Payments', due: 'This Week', progress: 15, color: '#3b82f6' },
                            { title: 'Inventory Audit', due: 'Next Week', progress: 0, color: '#10b981' }
                          ].map((task, i) => (
                            <div key={i} className="hover-scale" style={{ padding: '12px', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{task.title}</span>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: task.color }}>{task.due}</span>
                              </div>
                              <div className="progress-bar-bg">
                                <div className="progress-bar-fill" style={{ width: `${task.progress}%`, background: task.color }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                      {/* SECTION 6: LOW STOCK */}
                      <div className="glass-panel" style={{ padding: '24px', margin: 0 }}>
                        <div className="panel-header">
                          <h2 className="panel-title"><Package size={18} color="var(--warning)" /> Low Stock Alerts</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {[
                            { item: 'Printer Ink (Black)', stock: 2, alert: 5 },
                            { item: 'A4 Paper Rims', stock: 12, alert: 20 },
                            { item: 'Wireless Mouse', stock: 4, alert: 10 }
                          ].map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                              <div>
                                <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>{item.item}</div>
                                <div style={{ fontSize: '11px', color: 'var(--danger)' }}>{item.stock} left (Min: {item.alert})</div>
                              </div>
                              <button type="button" className="btn btn-secondary hover-scale" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setStatus('Restock workflow coming soon')}>Restock</button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SECTION 7: EMPLOYEE OVERVIEW */}
                      <div className="glass-panel" style={{ padding: '24px', margin: 0 }}>
                        <div className="panel-header">
                          <h2 className="panel-title"><Users size={18} color="#06b6d4" /> Employee Overview</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                          <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--success)' }}>24</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present</div>
                          </div>
                          <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--danger)' }}>2</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Absent</div>
                          </div>
                          <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--warning)' }}>1</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Late</div>
                          </div>
                          <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--brand-primary)' }}>3</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>On Leave</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <Gift size={14} color="#ec4899" /> <strong style={{ color: 'var(--text-primary)' }}>Rahul's</strong> birthday is tomorrow!
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN (SIDE PANEL) */}
                  <div className="dashboard-side-column">
                    
                    {/* SECTION 10: TODAY'S AGENDA / CALENDAR */}
                    <div className="glass-panel" style={{ padding: '24px', margin: 0 }}>
                      <div className="panel-header">
                        <h2 className="panel-title"><Calendar size={18} color="var(--brand-primary)" /> Today's Agenda</h2>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px', background: 'var(--brand-secondary)', borderRadius: '8px' }}>
                        <div style={{ textAlign: 'center', minWidth: '45px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--brand-primary)', textTransform: 'uppercase' }}>{new Date().toLocaleString('default', { month: 'short' })}</div>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--brand-primary)', lineHeight: '1' }}>{new Date().getDate()}</div>
                        </div>
                        <div style={{ height: '30px', width: '2px', background: 'rgba(59, 130, 246, 0.2)' }}></div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{new Date().toLocaleString('default', { weekday: 'long' })}</div>
                          <div style={{ fontSize: '12px', color: 'var(--brand-primary)' }}>3 Events scheduled</div>
                        </div>
                      </div>
                      <div className="timeline">
                        {[
                          { time: '09:00 AM', title: 'Team Standup', type: 'meeting' },
                          { time: '11:30 AM', title: 'Client Call: Acme Corp', type: 'call' },
                          { time: '03:00 PM', title: 'Tax Review', type: 'task' }
                        ].map((evt, i) => (
                          <div key={i} className="timeline-item" style={{ gap: '12px' }}>
                            <div className="timeline-icon" style={{ left: '-20px', color: 'var(--text-muted)', padding: '2px' }}><CheckCircle size={12} /></div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', width: '55px', flexShrink: 0, marginTop: '2px' }}>{evt.time}</div>
                            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{evt.title}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SECTION 10: WEATHER & NOTES */}
                    <div className="glass-panel" style={{ padding: '24px', margin: 0, background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', color: 'white', border: 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '13px', opacity: 0.9 }}>Mumbai, India</div>
                          <div style={{ fontSize: '28px', fontWeight: '700' }}>32°C</div>
                          <div style={{ fontSize: '13px', opacity: 0.9 }}>Partly Cloudy</div>
                        </div>
                        <Cloud size={48} opacity={0.9} />
                      </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '24px', margin: 0 }}>
                      <div className="panel-header">
                        <h2 className="panel-title"><FileText size={18} color="var(--brand-primary)" /> Quick Notes</h2>
                        <button type="button" className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '12px', background: 'var(--bg-secondary)' }} onClick={() => { localStorage.setItem('trinetr-quick-notes', quickNote); setStatus('Note saved securely'); }}>Save Note</button>
                      </div>
                      <textarea placeholder="Jot down quick thoughts here..." value={quickNote} onChange={(e) => setQuickNote(e.target.value)} style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: '13px', resize: 'none' }}></textarea>
                    </div>

                    {/* SECTION 5: NOTIFICATION CENTER */}
                    <div className="glass-panel" style={{ padding: '24px', margin: 0 }}>
                      <div className="panel-header">
                        <h2 className="panel-title">
                          <Bell size={18} color="var(--brand-primary)" /> Notifications 
                          <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>2 New</span>
                        </h2>
                        <button type="button" className="btn btn-ghost" style={{ padding: '4px', fontSize: '11px' }} onClick={() => setStatus('Notifications marked as read')}>Mark all read</button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                          { title: 'Payment Received', desc: '₹4,500 from Globex Inc', unread: true },
                          { title: 'Inventory Alert', desc: 'Black Ink is running low', unread: true },
                          { title: 'System Update', desc: 'v2.4.1 has been deployed', unread: false }
                        ].map((notif, i) => (
                          <div key={i} className="hover-scale" style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '8px', background: notif.unread ? 'var(--brand-secondary)' : 'var(--bg-secondary)', border: `1px solid ${notif.unread ? 'rgba(59, 130, 246, 0.2)' : 'var(--border-subtle)'}` }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: notif.unread ? 'var(--brand-primary)' : 'transparent', marginTop: '6px', flexShrink: 0 }}></div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{notif.title}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{notif.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'ai-assistant' && (
            <section className="panel ai-panel fade-in" id="ai-assistant">
              <div className="section-header">
                <div>
                  <span className="eyebrow">AI Business Console</span>
                  <h2>Business Health Diagnostics</h2>
                  <p className="panel-hint">
                    Local analysis of double-entry ledger transactions, credit statements, and payment cycles.
                  </p>
                </div>
                <div className="health-badge-wrap">
                  <CircularHealthScore score={aiInsights.score} />
                  <span className="health-score-value">{aiInsights.health} ({aiInsights.score}/100)</span>
                </div>
              </div>

              <div className="ai-stats-breakdown">
                <div className="insight-metric-card">
                  <div className="insight-metric-title">
                    <span>Profit Trend</span>
                    <strong>{aiInsights.profitTrend}</strong>
                  </div>
                  <div className="insight-progress-bar">
                    <div 
                      className="insight-progress-fill success" 
                      style={{ width: `${aiInsights.profitTrend === 'Upward' ? 100 : aiInsights.profitTrend === 'Stable' ? 65 : 30}%` }} 
                    />
                  </div>
                </div>

                <div className="insight-metric-card">
                  <div className="insight-metric-title">
                    <span>Cash Flow Status</span>
                    <strong>{aiInsights.cashFlowStatus}</strong>
                  </div>
                  <div className="insight-progress-bar">
                    <div 
                      className="insight-progress-fill primary" 
                      style={{ width: `${aiInsights.cashFlowStatus === 'Healthy' ? 100 : aiInsights.cashFlowStatus === 'Strained' ? 60 : 25}%` }} 
                    />
                  </div>
                </div>

                <div className="insight-metric-card">
                  <div className="insight-metric-title">
                    <span>Collection Efficiency</span>
                    <strong>{aiInsights.collectionEfficiency}%</strong>
                  </div>
                  <div className="insight-progress-bar">
                    <div 
                      className="insight-progress-fill warning" 
                      style={{ width: `${aiInsights.collectionEfficiency}%` }} 
                    />
                  </div>
                </div>

                <div className="insight-metric-card">
                  <div className="insight-metric-title">
                    <span>Expense Control</span>
                    <strong>{aiInsights.expenseControlScore}/100</strong>
                  </div>
                  <div className="insight-progress-bar">
                    <div 
                      className="insight-progress-fill success" 
                      style={{ width: `${aiInsights.expenseControlScore}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="ai-checker-grid">
                <div className="ai-list good">
                  <h3>AI Positive Indicators</h3>
                  <p>• Sabhi accounts double-entry standards me mathematically check ho rahe hain.</p>
                  {aiInsights.score >= 60 ? (
                    <p>• Health score strong hai. Working capital cycles regular hain.</p>
                  ) : (
                    <p>• Working capital constraints warning level pe hai.</p>
                  )}
                  {cashInHand >= 0 && (
                    <p>• Liquid cash positions stable hain. Short-term payables easily addressable hain.</p>
                  )}
                </div>
                <div className="ai-list watch">
                  <h3>AI Suggestions & Warnings</h3>
                  {aiInsights.suggestions.map((text, idx) => (
                    <p key={idx}>• {text}</p>
                  ))}
                </div>
              </div>

              <form className="ai-calculator" onSubmit={answerAiQuestion}>
                <label className="field-label" htmlFor="ai-question">
                  Ask AI Assistant / Quick Calculator
                </label>
                <div className="ai-input-row">
                  <input
                    id="ai-question"
                    value={aiQuestion}
                    onChange={(event) => setAiQuestion(event.target.value)}
                    placeholder="Ask about profit / cash balance / outstanding / enter expression (e.g. 5000 + 4500 * 0.18)"
                  />
                  <button className="manual-button" type="submit">
                    Ask AI
                  </button>
                </div>
                <div className="ai-answer">{aiAnswer}</div>
              </form>
            </section>
          )}

          {[
            'inventory',
            'invoices',
            'gst',
            'crm',
            'suppliers',
            'businesses',
            'cloud-backup',
            'notifications',
            'analytics',
          ].includes(activeTab) && (
            <Suspense fallback={<div className="panel skeleton-panel">Loading ERP module...</div>}>
              <Phase2ERP
                activeTab={activeTab}
                profile={profile}
                vouchers={vouchers}
                ledgers={ledgers}
                partySummary={partySummary}
                cashBalance={cashInHand}
                netProfit={monthlyNetProfit}
                cloudCustomers={cloudCustomers}
                cloudSuppliers={cloudSuppliers}
                cloudInventory={cloudInventory}
                cloudStockTransactions={cloudStockTransactions}
                cloudInvoices={cloudInvoices}
                cloudBusinesses={cloudBusinesses}
                cloudNotifications={cloudNotifications}
                cloudUserId={authUser?.uid}
                peopleLoading={peopleLoading}
                onStatus={setStatus}
                onCloudRecord={saveAuthenticatedCloudRecord}
                onCloudDelete={deleteAuthenticatedCloudRecord}
                onAtomicInvoiceWithStock={saveAtomicInvoiceWithStock}
                onCloudSnapshot={saveCloudDataSnapshot}
              />
            </Suspense>
          )}

          {[
            'mobile-app',
            'whatsapp-automation',
            'upi-payments',
            'orders',
            'voice-bookkeeper',
            'employees',
            'subscriptions',
            'accountant-portal',
            'security-center',
          ].includes(activeTab) && (
            <Suspense fallback={<div className="panel skeleton-panel">Loading operations module...</div>}>
              <Phase3Ops
                activeTab={activeTab}
                profile={profile}
                invoices={cloudInvoices}
                customers={cloudCustomers}
                products={cloudInventory}
                vouchers={vouchers}
                partySummary={partySummary}
                authUser={authUser}
                supabaseEnabled={supabaseEnabled}
                cloudOrders={cloudOrders}
                cloudEmployees={cloudEmployees}
                cloudAttendance={cloudAttendance}
                cloudLeaveBalances={cloudLeaveBalances}
                cloudLeaveRequests={cloudLeaveRequests}
                cloudHolidays={cloudHolidays}
                cloudSalaryHistory={cloudSalaryHistory}
                cloudPayslips={cloudPayslips}
                cloudEmployeeDocuments={cloudEmployeeDocuments}
                cloudPayments={cloudPayments}
                cloudAuditLogs={cloudAuditLogs}
                cloudSubscription={cloudSubscription}
                cloudSecurity={cloudSecurity}
                cloudDevices={cloudDevices}
                cloudOfflineQueue={cloudOfflineQueue}
                onResendVerification={resendVerificationEmail}
                onStatus={setStatus}
                onCloudRecord={saveAuthenticatedCloudRecord}
                onCloudDelete={deleteAuthenticatedCloudRecord}
                onHrmsDocumentUpload={uploadAuthenticatedHrmsDocument}
                onHrmsDocumentDelete={deleteAuthenticatedHrmsDocument}
                onHrmsDocumentUrl={getAuthenticatedHrmsDocumentUrl}
                onCloudSnapshot={saveCloudDataSnapshot}
                onAtomicPaymentWithLedger={postAtomicPaymentWithLedger}
                onAtomicPaymentEdit={editAtomicPaymentWithLedgerReversal}
                onAtomicPaymentDelete={deleteAtomicPaymentWithLedgerReversal}
              />
            </Suspense>
          )}

          {activeTab === 'voucher-entry' && (
            <section className="content-grid fade-in" id="voucher-entry">
              <article className="panel">
                <h2>{editingVoucher ? 'Edit Voucher' : 'Voucher Entry'}</h2>
                <p className="panel-hint">
                  Receipt / Payment = cash. Sales / Purchase = credit (party khata). Every voucher balances debit and
                  credit.
                </p>
                <form onSubmit={saveVoucherEntry}>
                  <div className="form-grid">
                    <div>
                      <label className="field-label" htmlFor="voucher-type">
                        Voucher Type
                      </label>
                      <select
                        id="voucher-type"
                        value={voucherType}
                        onChange={(event) => setVoucherType(event.target.value)}
                      >
                        <option value="Receipt">Receipt (cash in)</option>
                        <option value="Payment">Payment (cash out)</option>
                        <option value="Sales">Sales (credit — customer owes)</option>
                        <option value="Purchase">Purchase (credit — you owe supplier)</option>
                      </select>
                    </div>
                    <div>
                      <label className="field-label" htmlFor="voucher-date">
                        Date
                      </label>
                      <input
                        id="voucher-date"
                        type="date"
                        value={voucherDate}
                        onChange={(event) => setVoucherDate(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="voucher-amount">
                        Amount
                      </label>
                      <input
                        id="voucher-amount"
                        min="0"
                        step="1"
                        type="number"
                        value={voucherAmount}
                        onChange={(event) => setVoucherAmount(event.target.value)}
                        placeholder="Example: 2500"
                      />
                    </div>
                    {(voucherType === 'Receipt' || voucherType === 'Payment') && (
                      <div>
                        <label className="field-label" htmlFor="voucher-cash">
                          Cash / Bank
                        </label>
                        <select
                          id="voucher-cash"
                          value={voucherCashId}
                          onChange={(event) => setVoucherCashId(event.target.value)}
                        >
                          {cashLedgers.map((ledger) => (
                            <option key={ledger.id} value={ledger.id}>
                              {ledger.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {voucherType === 'Receipt' ? (
                      <div>
                        <label className="field-label" htmlFor="receipt-counter">
                          Credit To
                        </label>
                        <select
                          id="receipt-counter"
                          value={useSalesInsteadOfParty ? SALES_LEDGER_ID : voucherPartyId}
                          onChange={(event) => {
                            if (event.target.value === SALES_LEDGER_ID) {
                              setUseSalesInsteadOfParty(true);
                            } else {
                              setUseSalesInsteadOfParty(false);
                              setVoucherPartyId(event.target.value);
                            }
                          }}
                        >
                          <option value={SALES_LEDGER_ID}>Sales (general income)</option>
                          {customerParties.map((ledger) => (
                            <option key={ledger.id} value={ledger.id}>
                              {ledger.name} (party)
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : voucherType === 'Payment' ? (
                      <div>
                        <label className="field-label" htmlFor="payment-expense">
                          Debit To
                        </label>
                        <select
                          id="payment-expense"
                          value={useExpenseInsteadOfSupplier ? voucherExpenseId : voucherPartyId}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (supplierParties.some((party) => party.id === value)) {
                              setUseExpenseInsteadOfSupplier(false);
                              setVoucherPartyId(value);
                              return;
                            }
                            setUseExpenseInsteadOfSupplier(true);
                            setVoucherExpenseId(value);
                          }}
                        >
                          <optgroup label="Expenses">
                            {expenseLedgers.map((ledger) => (
                              <option key={ledger.id} value={ledger.id}>
                                {ledger.name}
                              </option>
                            ))}
                          </optgroup>
                          {supplierParties.length > 0 && (
                            <optgroup label="Suppliers">
                              {supplierParties.map((ledger) => (
                                <option key={ledger.id} value={ledger.id}>
                                  {ledger.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    ) : voucherType === 'Sales' ? (
                      <div>
                        <label className="field-label" htmlFor="sales-customer">
                          Customer (credit sale)
                        </label>
                        <select
                          id="sales-customer"
                          value={voucherPartyId}
                          onChange={(event) => {
                            setUseSalesInsteadOfParty(false);
                            setVoucherPartyId(event.target.value);
                          }}
                        >
                          <option value="">Select customer</option>
                          {customerParties.map((ledger) => (
                            <option key={ledger.id} value={ledger.id}>
                              {ledger.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : voucherType === 'Purchase' ? (
                      <>
                        <div>
                          <label className="field-label" htmlFor="purchase-ledger">
                            Purchase / Material
                          </label>
                          <select
                            id="purchase-ledger"
                            value={voucherExpenseId}
                            onChange={(event) => setVoucherExpenseId(event.target.value)}
                          >
                            {expenseLedgers.map((ledger) => (
                              <option key={ledger.id} value={ledger.id}>
                                {ledger.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="field-label" htmlFor="purchase-supplier">
                            Supplier (credit purchase)
                          </label>
                          <select
                            id="purchase-supplier"
                            value={voucherPartyId}
                            onChange={(event) => {
                              setUseExpenseInsteadOfSupplier(false);
                              setVoucherPartyId(event.target.value);
                            }}
                          >
                            <option value="">Select supplier</option>
                            {supplierParties.map((ledger) => (
                              <option key={ledger.id} value={ledger.id}>
                                {ledger.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : null}
                    <div className="wide-field">
                      <label className="field-label" htmlFor="voucher-narration">
                        Narration
                      </label>
                      <textarea
                        id="voucher-narration"
                        value={voucherNarration}
                        onChange={(event) => setVoucherNarration(event.target.value)}
                        placeholder="Example: Received 2500 from Ram Traders"
                      />
                    </div>
                  </div>
                  <div className="inline-actions">
                    <button className="manual-button" type="submit">
                      {editingVoucher ? 'Update' : 'Save'} {voucherType} Voucher
                    </button>
                    {editingVoucher && (
                      <button
                        className="secondary-button compact-button"
                        type="button"
                        onClick={() => {
                          setEditingVoucher(null);
                          setVoucherAmount('');
                          setVoucherNarration('');
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </article>

              <article className="panel">
                <h2>Add Party (Khata)</h2>
                <form onSubmit={addParty}>
                  <div className="form-grid">
                    <div>
                      <label className="field-label" htmlFor="party-name">
                        Party Name
                      </label>
                      <input
                        id="party-name"
                        value={newPartyName}
                        onChange={(event) => setNewPartyName(event.target.value)}
                        placeholder="Example: Ram Traders"
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="party-type">
                        Party Type
                      </label>
                      <select
                        id="party-type"
                        value={newPartyType}
                        onChange={(event) => setNewPartyType(event.target.value)}
                      >
                        <option value="customer">Customer (they owe you)</option>
                        <option value="supplier">Supplier (you owe them)</option>
                      </select>
                    </div>
                  </div>
                  <button className="secondary-button" type="submit">
                    Add Party Ledger
                  </button>
                </form>
              </article>
            </section>
          )}

          {activeTab === 'party-management' && (
            <section className="panel fade-in crm-container" id="party-management" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
              {!selectedCrmCustomer ? (
                <>
                  <div className="section-header" style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', marginBottom: '0' }}>
                    <div>
                      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={24} className="text-blue" /> CRM & Party Hub</h2>
                      <p className="panel-hint">Manage customers, suppliers, financial standing, and interactions.</p>
                    </div>
                    <div className="inline-actions">
                      <button type="button" className="primary-button" onClick={() => setStatus('Add Customer drawer coming soon')}><Plus size={16}/> New Party</button>
                    </div>
                  </div>
                  
                  <div className="crm-toolbar">
                    <div className="search-wrap" style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-secondary)' }} />
                      <input type="text" className="crm-search-input" placeholder="Search by name, phone, or GST..." />
                    </div>
                    <div className="crm-toolbar-actions">
                      <button type="button" className="secondary-button" onClick={() => setStatus('Filters coming soon')}><Filter size={16}/> Filters</button>
                      <button type="button" className="secondary-button" onClick={() => setStatus('Tags coming soon')}><Tag size={16}/> Tags</button>
                      <button type="button" className="secondary-button" onClick={() => setStatus('Export coming soon')}><Download size={16}/> Export</button>
                    </div>
                  </div>

                  <div className="crm-table-wrapper fade-in">
                    <table className="crm-table">
                      <thead>
                        <tr>
                          <th>Customer / Supplier</th>
                          <th>Status & Tags</th>
                          <th>Lifetime Value (LTV)</th>
                          <th>Outstanding Balance</th>
                          <th>Last Activity</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partySummary.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '80px', height: '80px', background: 'var(--bg-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Users size={32} color="var(--text-secondary)" />
                                </div>
                                <div>
                                  <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>No Customers Yet</h3>
                                  <p className="text-secondary" style={{ fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}>No customers yet. Add your first customer or import customers.</p>
                                </div>
                                <button type="button" className="primary-button" style={{ marginTop: '8px' }} onClick={() => setStatus('Add Customer drawer coming soon')}><Plus size={16}/> Add Customer</button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          partySummary.map((party, i) => {
                            const isDebtor = party.group === 'Sundry Debtors';
                            const balance = party.outstandingAmount;
                            // Mock CRM tags for demonstration
                            const tags = [];
                            if (party.totalSales > 50000) tags.push({ label: 'VIP', class: 'vip' });
                            if (isDebtor && balance > 10000) tags.push({ label: 'High Risk', class: 'high-risk' });
                            if (i % 3 === 0) tags.push({ label: 'Wholesale', class: 'wholesale' });
                            if (tags.length === 0) tags.push({ label: 'Retail', class: 'retail' });
                            
                            return (
                              <tr key={party.id} onClick={() => setSelectedCrmCustomer(party)} style={{cursor: 'pointer'}}>
                                <td>
                                  <div className="crm-customer-cell">
                                    <div className="crm-avatar">{party.name.charAt(0).toUpperCase()}</div>
                                    <div>
                                      <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{party.name}</div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{isDebtor ? 'Customer' : 'Supplier'} • ID: {party.id.slice(0,6)}</div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {tags.map((t, idx) => (
                                      <span key={idx} className={`crm-tag ${t.class}`}>{t.label}</span>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ fontWeight: '500' }}>{formatCurrency(party.totalSales + party.totalPayments)}</td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: balance === 0 ? 'var(--success)' : isDebtor ? 'var(--warning)' : 'var(--danger)' }}></div>
                                    <strong style={{ color: balance === 0 ? 'var(--text-secondary)' : isDebtor ? 'var(--warning)' : 'var(--danger)' }}>
                                      {balance === 0 ? 'Settled' : isDebtor ? `${formatCurrency(balance)}` : `${formatCurrency(Math.abs(balance))} Cr`}
                                    </strong>
                                  </div>
                                </td>
                                <td className="text-secondary">{party.lastTransactionDate || 'N/A'}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button className="icon-button" onClick={(e) => { e.stopPropagation(); }} title="Quick Actions">
                                    <MoreHorizontal size={18} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="crm-toolbar fade-in" style={{ border: 'none', padding: '0 0 16px 0', background: 'transparent' }}>
                    <button className="secondary-button" onClick={() => setSelectedCrmCustomer(null)}>
                      <ArrowLeft size={16} /> Back to List
                    </button>
                    <div className="crm-toolbar-actions">
                      <button type="button" className="secondary-button" onClick={() => setStatus('Edit Profile coming soon')}><Edit3 size={16} /> Edit Profile</button>
                      <button type="button" className="primary-button" onClick={() => { setStatus('Redirecting to New Invoice'); setActiveTab('invoices'); }}><Plus size={16} /> Create Invoice</button>
                    </div>
                  </div>
                  
                  <div className="profile-grid-layout fade-in">
                    {/* Sidebar */}
                    <div className="profile-sidebar">
                       <div className="profile-avatar-large">{selectedCrmCustomer.name.charAt(0).toUpperCase()}</div>
                       <div style={{ textAlign: 'center' }}>
                         <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>{selectedCrmCustomer.name}</h2>
                         <p className="text-secondary" style={{ fontSize: '14px' }}>{selectedCrmCustomer.group === 'Sundry Debtors' ? 'Customer' : 'Supplier'}</p>
                       </div>
                       
                       <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                         <span className="crm-tag vip">VIP</span>
                         <span className="crm-tag retail">Active</span>
                       </div>
                       
                       <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '8px 0' }} />
                       
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <Phone size={16} className="text-secondary" />
                           </div>
                           <div style={{ fontSize: '13px' }}>
                             <div className="text-secondary">Phone</div>
                             <div style={{ fontWeight: '500' }}>+91 98765 43210</div>
                           </div>
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <Mail size={16} className="text-secondary" />
                           </div>
                           <div style={{ fontSize: '13px' }}>
                             <div className="text-secondary">Email</div>
                             <div style={{ fontWeight: '500' }}>contact@company.com</div>
                           </div>
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <MapPin size={16} className="text-secondary" />
                           </div>
                           <div style={{ fontSize: '13px' }}>
                             <div className="text-secondary">Location</div>
                             <div style={{ fontWeight: '500' }}>Mumbai, Maharashtra</div>
                           </div>
                         </div>
                       </div>
                       
                       <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '8px 0' }} />
                       
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                         <button type="button" className="secondary-button" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setStatus('WhatsApp integration coming soon')}><MessageCircle size={16} /> Send WhatsApp</button>
                         <button type="button" className="secondary-button" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setStatus('Email integration coming soon')}><Mail size={16} /> Send Email</button>
                       </div>
                    </div>
                    
                    {/* Main Content */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Financials Row */}
                      <div className="dashboard-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div className="kpi-card" style={{ padding: '20px' }}>
                          <div className="kpi-header">
                            <span className="text-secondary" style={{ fontSize: '13px', fontWeight: '500' }}>Lifetime Value</span>
                            <div className="kpi-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--brand-primary)' }}>
                              <Star size={18} />
                            </div>
                          </div>
                          <div className="kpi-value" style={{ fontSize: '24px', margin: '12px 0 4px' }}>{formatCurrency(selectedCrmCustomer.totalSales + selectedCrmCustomer.totalPayments)}</div>
                          <div className="kpi-trend trend-up" style={{ fontSize: '12px' }}><ArrowUpRight size={14}/> Top 10% Customer</div>
                        </div>
                        
                        <div className="kpi-card" style={{ padding: '20px' }}>
                          <div className="kpi-header">
                            <span className="text-secondary" style={{ fontSize: '13px', fontWeight: '500' }}>Outstanding</span>
                            <div className="kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                              <AlertCircle size={18} />
                            </div>
                          </div>
                          <div className="kpi-value" style={{ fontSize: '24px', margin: '12px 0 4px', color: selectedCrmCustomer.outstandingAmount > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {formatCurrency(selectedCrmCustomer.outstandingAmount)}
                          </div>
                          <div className="kpi-trend trend-neutral" style={{ fontSize: '12px' }}>Credit Limit: ₹50,000</div>
                        </div>
                        
                        <div className="kpi-card" style={{ padding: '20px' }}>
                          <div className="kpi-header">
                            <span className="text-secondary" style={{ fontSize: '13px', fontWeight: '500' }}>Last Payment</span>
                            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                              <CheckCircle size={18} />
                            </div>
                          </div>
                          <div className="kpi-value" style={{ fontSize: '24px', margin: '12px 0 4px' }}>{selectedCrmCustomer.lastTransactionDate || 'None'}</div>
                          <div className="kpi-trend text-secondary" style={{ fontSize: '12px' }}>Via UPI</div>
                        </div>
                      </div>
                      
                      {/* Timeline & Notes Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                        {/* Timeline */}
                        <div className="panel" style={{ padding: '24px' }}>
                          <h3 style={{ fontSize: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={18} className="text-brand" /> CRM Activity
                          </h3>
                          <div className="timeline">
                            <div className="timeline-item">
                              <div className="timeline-icon" style={{ background: 'var(--brand-secondary)', color: 'var(--brand-primary)' }}>
                                <FileText size={14} />
                              </div>
                              <div className="timeline-content">
                                <div className="timeline-title">Invoice #INV-2024-089 Generated</div>
                                <div className="timeline-time">Today, 10:30 AM</div>
                              </div>
                            </div>
                            <div className="timeline-item">
                              <div className="timeline-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                                <Phone size={14} />
                              </div>
                              <div className="timeline-content">
                                <div className="timeline-title">Follow-up Call</div>
                                <div className="timeline-time">Yesterday, 4:15 PM • Notes: Asked for discount on next bulk order.</div>
                              </div>
                            </div>
                            <div className="timeline-item">
                              <div className="timeline-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                                <MessageCircle size={14} />
                              </div>
                              <div className="timeline-content">
                                <div className="timeline-title">WhatsApp Message Sent</div>
                                <div className="timeline-time">Oct 24, 2024 • Payment Reminder</div>
                              </div>
                            </div>
                            <div className="timeline-item">
                              <div className="timeline-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                                <CreditCard size={14} />
                              </div>
                              <div className="timeline-content">
                                <div className="timeline-title">Payment Received</div>
                                <div className="timeline-time">Oct 20, 2024 • ₹15,000 via NEFT</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Documents & Notes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          {/* Notes */}
                          <div className="panel" style={{ padding: '24px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309' }}>
                                <Star size={18} /> Pinned Note
                              </h3>
                              <button type="button" className="icon-button" style={{ color: '#b45309' }} onClick={() => setStatus('Edit coming soon')}><Edit3 size={16}/></button>
                            </div>
                            <p style={{ fontSize: '14px', color: '#92400e', lineHeight: '1.6' }}>
                              Customer prefers deliveries on weekends. Ensure GST invoice is always emailed to their finance department (finance@company.com) immediately after dispatch.
                            </p>
                          </div>
                          
                          {/* Documents */}
                          <div className="panel" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Paperclip size={18} className="text-secondary" /> Documents
                              </h3>
                              <button type="button" className="secondary-button" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => setStatus('Upload coming soon')}><Plus size={14}/> Upload</button>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div className="doc-card">
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                  <FileText size={18} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '500' }}>GST_Certificate.pdf</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Added Oct 10 • 245 KB</div>
                                </div>
                                <Download size={16} className="text-secondary" />
                              </div>
                              <div className="doc-card">
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db2777' }}>
                                  <ImageIcon size={18} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '500' }}>Store_Front.jpg</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Added Oct 10 • 1.2 MB</div>
                                </div>
                                <Download size={16} className="text-secondary" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === 'reports' && (
            <section className="panel reports-panel fade-in" id="reports">
              <div className="section-header">
                <div>
                  <h2>Business Reports Console</h2>
                  <p className="panel-hint">Review Profit & Loss statements, Cash Books, and customer outstanding summaries.</p>
                </div>
                <div className="inline-actions topbar-actions">
                  <button className="secondary-button" type="button" onClick={exportVouchersCsv}>
                    Export CSV
                  </button>
                  <button className="warning-button" type="button" onClick={printReport}>
                    Print Report
                  </button>
                </div>
              </div>

              {/* Sub Navigation */}
              <div className="reports-sub-nav">
                <button className={activeReportTab === 'pnl' ? 'active' : ''} onClick={() => setActiveReportTab('pnl')}>Profit & Loss</button>
                <button className={activeReportTab === 'daybook' ? 'active' : ''} onClick={() => setActiveReportTab('daybook')}>Day Book</button>
                <button className={activeReportTab === 'cashbook' ? 'active' : ''} onClick={() => setActiveReportTab('cashbook')}>Cash Book</button>
                <button className={activeReportTab === 'customer' ? 'active' : ''} onClick={() => setActiveReportTab('customer')}>Customer Outstanding</button>
                <button className={activeReportTab === 'supplier' ? 'active' : ''} onClick={() => setActiveReportTab('supplier')}>Supplier Outstanding</button>
              </div>

              {/* Filter Row for Date-based Reports (Day Book & Cash Book) */}
              {(activeReportTab === 'daybook' || activeReportTab === 'cashbook') && (
                <div className="reports-filter-row">
                  <div>
                    <label className="field-label">From Date</label>
                    <input type="date" value={dayBookFromDate} onChange={(e) => setDayBookFromDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">To Date</label>
                    <input type="date" value={dayBookToDate} onChange={(e) => setDayBookToDate(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Onscreen Report Preview */}
              <div className="onscreen-report-container">
                {activeReportTab === 'pnl' && (
                  <div className="pnl-report-view">
                    <h3 className="report-view-title">Profit & Loss Statement</h3>
                    <div className="pnl-grid">
                      <div className="pnl-row header-row">
                        <span>Particulars</span>
                        <span>Debit (Dr)</span>
                        <span>Credit (Cr)</span>
                      </div>
                      <div className="pnl-row">
                        <span>Sales Revenue</span>
                        <span>—</span>
                        <span className="text-green">{formatCurrency(pnlData.sales)}</span>
                      </div>
                      <div className="pnl-row">
                        <span>Less: Purchase Accounts (Material / Purchase)</span>
                        <span className="text-red">{formatCurrency(pnlData.purchases)}</span>
                        <span>—</span>
                      </div>
                      <div className="pnl-row subtotal-row">
                        <span>Gross Profit</span>
                        <span>—</span>
                        <strong>{formatCurrency(pnlData.grossProfit)}</strong>
                      </div>
                      <div className="pnl-row">
                        <span>Less: Rent Expenses</span>
                        <span className="text-red">{formatCurrency(pnlData.rent)}</span>
                        <span>—</span>
                      </div>
                      <div className="pnl-row">
                        <span>Less: General Expenses</span>
                        <span className="text-red">{formatCurrency(pnlData.general)}</span>
                        <span>—</span>
                      </div>
                      <div className="pnl-row total-row">
                        <span>Net Profit</span>
                        <span>—</span>
                        <strong className="text-green">{formatCurrency(pnlData.netProfit)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {activeReportTab === 'daybook' && (
                  <div className="daybook-report-view">
                    <h3 className="report-view-title">Day Book Report ({dayBookFromDate} to {dayBookToDate})</h3>
                    <table className="statement-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Voucher ID</th>
                          <th>Type</th>
                          <th>Particulars</th>
                          <th>Narration</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vouchers
                          .filter(v => v.date >= dayBookFromDate && v.date <= dayBookToDate)
                          .map(v => (
                            <tr key={v.id}>
                              <td>{v.date}</td>
                              <td><code className="text-muted">{v.id.slice(0, 10)}</code></td>
                              <td><span className={`badge badge-${v.type.toLowerCase()}`}>{v.type}</span></td>
                              <td>{counterLabel(v)}</td>
                              <td>{v.narration}</td>
                              <td><strong>{formatCurrency(v.amount)}</strong></td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeReportTab === 'cashbook' && (
                  <div className="cashbook-report-view">
                    <h3 className="report-view-title">Cash Book Statement ({dayBookFromDate} to {dayBookToDate})</h3>
                    <table className="statement-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Particulars (Counter)</th>
                          <th>Type</th>
                          <th>Receipts (Dr)</th>
                          <th>Payments (Cr)</th>
                          <th>Running Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashBookData.rows
                          .filter(r => r.date >= dayBookFromDate && r.date <= dayBookToDate)
                          .map((r, idx) => (
                            <tr key={idx}>
                              <td>{r.date}</td>
                              <td>{r.particulars}</td>
                              <td><span className={`badge badge-${r.type.toLowerCase()}`}>{r.type}</span></td>
                              <td>{r.debit ? <span className="text-green">+{formatCurrency(r.debit)}</span> : '—'}</td>
                              <td>{r.credit ? <span className="text-red">-{formatCurrency(r.credit)}</span> : '—'}</td>
                              <td><strong>{formatCurrency(r.balance)}</strong></td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeReportTab === 'customer' && (
                  <div className="customer-report-view">
                    <h3 className="report-view-title">Customer Outstanding Receivables</h3>
                    <table className="statement-table">
                      <thead>
                        <tr>
                          <th>Customer Name</th>
                          <th>Total Sales Invoiced</th>
                          <th>Total Payments Received</th>
                          <th>Outstanding Balance</th>
                          <th>Last Transaction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partySummary
                          .filter(p => p.group === 'Sundry Debtors' && p.outstandingAmount > 0)
                          .map(p => (
                            <tr key={p.id}>
                              <td><strong>{p.name}</strong></td>
                              <td>{formatCurrency(p.totalSales)}</td>
                              <td>{formatCurrency(p.totalPayments)}</td>
                              <td><strong className="text-amber">{formatCurrency(p.outstandingAmount)}</strong></td>
                              <td>{p.lastTransactionDate}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeReportTab === 'supplier' && (
                  <div className="supplier-report-view">
                    <h3 className="report-view-title">Supplier Outstanding Payables</h3>
                    <table className="statement-table">
                      <thead>
                        <tr>
                          <th>Supplier Name</th>
                          <th>Total Purchases Invoiced</th>
                          <th>Total Payments Made</th>
                          <th>Outstanding Balance</th>
                          <th>Last Transaction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partySummary
                          .filter(p => p.group === 'Sundry Creditors' && p.outstandingAmount > 0)
                          .map(p => (
                            <tr key={p.id}>
                              <td><strong>{p.name}</strong></td>
                              <td>{formatCurrency(p.totalSales)}</td>
                              <td>{formatCurrency(p.totalPayments)}</td>
                              <td><strong className="text-red">{formatCurrency(Math.abs(p.outstandingAmount))}</strong></td>
                              <td>{p.lastTransactionDate}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'day-book' && (
            <section className="panel fade-in" id="day-book">
              <div className="section-header">
                <h2>Day Book Overview</h2>
                <span>{filteredVouchers.length} Vouchers</span>
              </div>
              <label className="field-label" htmlFor="daybook-filter">
                Filter Day Book by Date
              </label>
              <input
                id="daybook-filter"
                type="date"
                value={dayBookFilter}
                onChange={(event) => setDayBookFilter(event.target.value)}
              />
              {dayBookFilter && (
                <button className="delete-entry-button" style={{ marginTop: '10px' }} type="button" onClick={() => setDayBookFilter('')}>
                  Clear Filter
                </button>
              )}
              {transactionsLoading && (
                <div className="notice" style={{ marginTop: '16px' }}>
                  Loading day book transactions from Supabase...
                </div>
              )}
              <div className="activity-list" style={{ marginTop: '20px' }}>
                {filteredVouchers.length === 0 ? (
                  <div className="empty-state">No vouchers recorded for this date.</div>
                ) : (
                  filteredVouchers.map((voucher) => (
                    <article className="activity-item" key={voucher.id}>
                      <div>
                        <p className={`activity-type voucher-${voucher.type.toLowerCase()}`}>{voucher.type}</p>
                        <p className="voucher-narration">{voucher.narration}</p>
                        <p className="voucher-meta">
                          {voucher.date} · {counterLabel(voucher)} · {voucher.source}
                        </p>
                      </div>
                      <strong>{formatCurrency(voucher.amount)}</strong>
                      <div className="voucher-actions">
                        <button className="share-entry-button" type="button" onClick={() => shareVoucher(voucher)}>
                          Share
                        </button>
                        <button className="share-entry-button" type="button" onClick={() => editVoucher(voucher)}>
                          Edit
                        </button>
                        <button className="share-entry-button" type="button" onClick={() => shareVoucherToWhatsApp(voucher)}>
                          WhatsApp
                        </button>
                        <button className="share-entry-button" type="button" onClick={() => shareVoucherToFacebook(voucher)}>
                          Facebook
                        </button>
                        <button className="share-entry-button" type="button" onClick={() => printVoucherReceipt(voucher)}>
                          PDF Receipt
                        </button>
                        <button className="delete-entry-button" type="button" onClick={() => removeVoucher(voucher.id)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === 'party-statement' && (
            <section className="panel fade-in" id="party-statement">
              <h2>Party Statement Ledger</h2>
              {partyLedgers.length === 0 ? (
                <p className="panel-hint">Add a customer or supplier party in Voucher Entry to check statement ledgers.</p>
              ) : (
                <>
                  <label className="field-label" htmlFor="statement-party">
                    Select Party
                  </label>
                  <select
                    id="statement-party"
                    value={statementLedgerId}
                    onChange={(event) => setStatementLedgerId(event.target.value)}
                  >
                    {partyLedgers.map((ledger) => (
                      <option key={ledger.id} value={ledger.id}>
                        {ledger.name} ({ledger.group})
                      </option>
                    ))}
                  </select>
                  {statement.ledger && (
                    <p className="statement-balance">
                      Closing balance: {formatPartyBalance(statement.ledger, statement.closingBalance)}
                    </p>
                  )}
                  <div className="statement-table-wrap">
                    <table className="statement-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Narration</th>
                          <th>Debit (Dr)</th>
                          <th>Credit (Cr)</th>
                          <th>Running Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statement.rows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="empty-state">
                              No statement entries found for this party.
                            </td>
                          </tr>
                        ) : (
                          statement.rows.map((row, index) => (
                            <tr key={index}>
                              <td>{row.date}</td>
                              <td><span className={`badge badge-${row.type.toLowerCase()}`}>{row.type}</span></td>
                              <td>{row.narration}</td>
                              <td>{row.debit ? formatCurrency(row.debit) : '—'}</td>
                              <td>{row.credit ? formatCurrency(row.credit) : '—'}</td>
                              <td><strong>{formatCurrency(row.balance)}</strong></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === 'company-setup' && (
            <section className="phase2-stack fade-in" id="company-setup">
              <div className="erp-hero">
                <div>
                  <span className="eyebrow">Company / Business Setup</span>
                  <h2>Modern accounting foundation for your business</h2>
                </div>
                <div className="erp-hero-actions"><strong>{profile.name}</strong><span>{profile.gstin || 'GST not set'}</span></div>
              </div>
              <section className="content-grid">
                <article className="panel">
                  <h2>Business Identity</h2>
                  <div className="account-detail-grid">
                    <div><dt>Business name</dt><dd>{profile.name}</dd></div>
                    <div><dt>Owner name</dt><dd>{profile.owner}</dd></div>
                    <div><dt>GST number</dt><dd>{profile.gstin || 'Not provided'}</dd></div>
                    <div><dt>Address</dt><dd>{profile.address || 'Not provided'}</dd></div>
                    <div><dt>Financial year</dt><dd>April to March</dd></div>
                    <div><dt>Currency</dt><dd>INR</dd></div>
                    <div><dt>Business type</dt><dd>{profile.tagline || 'Small business'}</dd></div>
                  </div>
                  <div className="inline-actions">
                    <a className="manual-button compact-link" href="#profile-settings">Edit Profile</a>
                    <button className="secondary-button compact-button" type="button" onClick={downloadFullBackup}>Backup / Export</button>
                  </div>
                </article>
                <article className="panel">
                  <h2>Accounting Readiness</h2>
                  <div className="summary-grid report-summary">
                    <div className="summary-card"><span>Ledgers</span><strong>{ledgers.length}</strong></div>
                    <div className="summary-card"><span>Vouchers</span><strong>{vouchers.length}</strong></div>
                    <div className="summary-card"><span>Customers</span><strong>{cloudCustomers.length}</strong></div>
                    <div className="summary-card"><span>Suppliers</span><strong>{cloudSuppliers.length}</strong></div>
                  </div>
                </article>
              </section>
            </section>
          )}

          {activeTab === 'masters' && (
            <section className="phase2-stack fade-in" id="masters">
              <div className="erp-hero"><div><span className="eyebrow">Masters</span><h2>Customers, suppliers, items, ledgers, tax, and payment setup</h2></div></div>
              <div className="tally-module-grid">
                {[
                  ['Customers', 'Customer profiles and receivables', 'crm', cloudCustomers.length],
                  ['Suppliers', 'Supplier profiles and payables', 'suppliers', cloudSuppliers.length],
                  ['Employees', 'Staff, salary, attendance', 'employees', cloudEmployees.length],
                  ['Products / Inventory Items', 'Stock items and price master', 'inventory', cloudInventory.length],
                  ['Ledgers', 'Cash, bank, parties, expenses', 'party-statement', ledgers.length],
                  ['Expense Categories', 'Expense and purchase ledgers', 'voucher-entry', expenseLedgers.length],
                  ['Payment Modes', 'Cash, bank and UPI flows', 'upi-payments', cashLedgers.length],
                  ['Tax / GST Rates', 'GST reports and summaries', 'gst', 'GST'],
                ].map(([title, body, href, count]) => (
                  <a className="tally-module-card" href={`#${href}`} key={title}>
                    <strong>{title}</strong><p>{body}</p><span>{count}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'vouchers-hub' && (
            <section className="phase2-stack fade-in" id="vouchers-hub">
              <div className="erp-hero"><div><span className="eyebrow">Vouchers / Transactions</span><h2>Simple entry screens with accounting-friendly debit and credit structure</h2></div></div>
              <div className="tally-module-grid">
                {[
                  ['Sales Voucher', 'Credit sale with customer ledger', 'voucher-entry'],
                  ['Purchase Voucher', 'Credit purchase with supplier ledger', 'voucher-entry'],
                  ['Payment Voucher', 'Cash or bank payment / expense', 'voucher-entry'],
                  ['Receipt Voucher', 'Cash or bank receipt / income', 'voucher-entry'],
                  ['Expense Voucher', 'Daily expenses and categories', 'voucher-entry'],
                  ['Contra Voucher', 'Cash and bank movement foundation', 'voucher-entry'],
                  ['Journal Voucher', 'Manual adjustment foundation', 'voucher-entry'],
                  ['Salary Voucher', 'Employee payroll foundation', 'employees'],
                  ['Advance Voucher', 'Employee advance tracking', 'employees'],
                ].map(([title, body, href]) => (
                  <a className="tally-module-card" href={`#${href}`} key={title}>
                    <strong>{title}</strong><p>{body}</p><span>Open</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'accounting-ledgers' && (
            <section className="phase2-stack fade-in" id="accounting-ledgers">
              <div className="erp-hero"><div><span className="eyebrow">Accounting / Ledger System</span><h2>Debit-credit ledgers powering customers, suppliers, cash, bank, income, and expense reports</h2></div></div>
              <section className="content-grid">
                <article className="panel">
                  <h2>Ledger Groups</h2>
                  <div className="compact-list">
                    {['Cash-in-hand', 'Bank Accounts', 'Sales Accounts', 'Purchase Accounts', 'Indirect Expenses', 'Sundry Debtors', 'Sundry Creditors'].map((group) => (
                      <article className="compact-item" key={group}><strong>{group}</strong><span className="status-pill draft">{ledgers.filter((ledger) => ledger.group === group).length}</span></article>
                    ))}
                  </div>
                </article>
                <article className="panel">
                  <h2>Ledger Reports</h2>
                  <div className="tally-quick-links">
                    <a href="#party-statement">Customer ledger</a>
                    <a href="#party-statement">Supplier ledger</a>
                    <a href="#reports">Expense ledger</a>
                    <a href="#reports">Payment ledger</a>
                    <a href="#reports">Cash / Bank ledger</a>
                  </div>
                </article>
              </section>
            </section>
          )}

          {activeTab === 'reports-hub' && (
            <section className="phase2-stack fade-in" id="reports-hub">
              <div className="erp-hero"><div><span className="eyebrow">Reports</span><h2>Tally-like reports for daily operations, GST, ledgers, payroll, and inventory</h2></div></div>
              <div className="tally-module-grid">
                {[
                  ['Day Book', 'Daily voucher register', 'day-book'],
                  ['Sales Report', 'Sales and receipt analysis', 'reports'],
                  ['Purchase Report', 'Purchase and supplier movement', 'reports'],
                  ['Expense Report', 'Expense categories and payments', 'reports'],
                  ['Profit & Loss', 'Income minus expenses', 'reports'],
                  ['Balance Summary', 'Assets, liabilities and balances', 'reports'],
                  ['Cash / Bank Summary', 'Cash and bank movements', 'reports'],
                  ['GST Summary', 'GST reserve and taxable values', 'gst'],
                  ['Outstanding Receivables', 'Customer dues', 'party-statement'],
                  ['Outstanding Payables', 'Supplier dues', 'party-statement'],
                  ['Salary Report', 'Payroll totals', 'employees'],
                  ['Attendance Report', 'Present/absent summary', 'employees'],
                  ['Inventory Stock Report', 'Stock value and low stock', 'inventory'],
                ].map(([title, body, href]) => (
                  <a className="tally-module-card" href={`#${href}`} key={title}>
                    <strong>{title}</strong><p>{body}</p><span>View</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'profile-settings' && (
            <section className="panel profile-editor fade-in" id="profile-settings">
              <div className="section-header">
                <div>
                  <h2>Business Profile</h2>
                  <p className="panel-hint">Configure your company identity, logo, and GST number for invoice printing.</p>
                </div>
                <span>Profile</span>
              </div>
              <form onSubmit={saveBusinessProfile}>
                <div className="profile-editor-grid">
                  <div className="profile-logo-card">
                    <img className="profile-logo-preview" src={profile.logo} alt="Business logo preview" />
                    <label className="field-label" htmlFor="profile-logo">
                      Upload Business Logo
                    </label>
                    <input accept="image/*" id="profile-logo" name="profileLogo" type="file" />
                  </div>
                  <div className="form-grid">
                    <div>
                      <label className="field-label" htmlFor="profile-name">
                        Company / Shop Name
                      </label>
                      <input id="profile-name" name="profileName" defaultValue={profile.name} required />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="profile-owner">
                        Owner Name
                      </label>
                      <input id="profile-owner" name="profileOwner" defaultValue={profile.owner} required />
                    </div>
                    <div className="wide-field">
                      <label className="field-label" htmlFor="profile-tagline">
                        Business Tagline / Description
                      </label>
                      <input id="profile-tagline" name="profileTagline" defaultValue={profile.tagline} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="profile-gstin">
                        GSTIN Number
                      </label>
                      <input id="profile-gstin" name="profileGstin" defaultValue={profile.gstin} placeholder="e.g. 27AAAAA1111A1Z1" />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="profile-phone">
                        Mobile Number
                      </label>
                      <input id="profile-phone" name="profilePhone" defaultValue={profile.phone} required />
                    </div>
                    <div className="wide-field">
                      <label className="field-label" htmlFor="profile-email">
                        Email Address
                      </label>
                      <input id="profile-email" name="profileEmail" type="email" defaultValue={profile.email} required />
                    </div>
                    <div className="wide-field">
                      <label className="field-label" htmlFor="profile-address">
                        Business Address
                      </label>
                      <textarea id="profile-address" name="profileAddress" defaultValue={profile.address} placeholder="Street, City, State, ZIP" />
                    </div>
                  </div>
                </div>
                <div className="inline-actions">
                  <button className="manual-button" type="submit">
                    Save Business Profile
                  </button>
                  <button className="warning-button" type="button" onClick={resetBusinessProfile}>
                    Reset Defaults
                  </button>
                </div>
              </form>
              <section className="account-status-card">
                <div className="section-header">
                  <div>
                    <h2>Supabase Account</h2>
                    <p className="panel-hint">Current authenticated user for secure cloud sync and RLS ownership.</p>
                  </div>
                  <span className={`runtime-pill ${authUser?.emailVerified ? 'online' : 'warning'}`}>
                    {authUser?.emailVerified ? 'Email verified' : 'Not verified'}
                  </span>
                </div>
                <dl className="account-detail-grid">
                  <div><dt>Logged in email</dt><dd><a href={`mailto:${authUser?.email || profile.email}`}>{authUser?.email || profile.email || 'Not available'}</a></dd></div>
                  <div><dt>User ID</dt><dd>{authUser?.uid || 'Not available'}</dd></div>
                  <div><dt>Account status</dt><dd>{authUser?.emailVerified ? 'Email verified' : 'Email not verified'}</dd></div>
                  <div><dt>Last sign-in</dt><dd>{authUser?.lastSignInAt || authUser?.loginAt || 'Not available'}</dd></div>
                </dl>
                <div className="inline-actions">
                  <button className="secondary-button compact-button" type="button" onClick={() => setAuthView('reset-password')}>
                    Change Password
                  </button>
                  {!authUser?.emailVerified && (
                    <button className="secondary-button compact-button" type="button" onClick={resendVerificationEmail} disabled={authLoading || verificationResending || verificationCooldown > 0}>
                      {verificationCooldown > 0 ? `Resend in ${verificationCooldown}s` : 'Resend Verification'}
                    </button>
                  )}
                  <button className="warning-button compact-button" type="button" onClick={logout}>
                    Logout
                  </button>
                </div>
              </section>
            </section>
          )}

          {activeTab === 'user-management' && (
            <section className="panel members-panel fade-in" id="user-management">
              <div className="section-header">
                <div>
                  <h2>Users & Roles</h2>
                  <p className="panel-hint">Invite team members and control access with Owner, Manager, Accountant, and Staff roles.</p>
                </div>
                <span>{isCompanyOwner ? 'Owner Access' : 'Owner Only'}</span>
              </div>

              {!isCompanyOwner ? (
                <div className="notice error">
                  Only the company owner can invite or manage members. Your current role is {authUser?.role || 'Guest'}.
                </div>
              ) : (
                <>
                  {memberError && <div className="notice error">{memberError}</div>}
                  {memberNotice && <div className="notice success">{memberNotice}</div>}

                  <form className="member-invite-card" onSubmit={handleInviteMember}>
                    <div>
                      <h3>Invite Member</h3>
                      <p className="panel-hint">Pending invites are stored in Supabase and role access is enforced by RLS.</p>
                    </div>
                    <div className="form-grid">
                      <div>
                        <label className="field-label" htmlFor="member-name">Name</label>
                        <input
                          id="member-name"
                          value={memberInvite.name}
                          onChange={(event) => setMemberInvite((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Example: Rahul Shah"
                        />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="member-email">Email</label>
                        <input
                          id="member-email"
                          type="email"
                          value={memberInvite.email}
                          onChange={(event) => setMemberInvite((current) => ({ ...current, email: event.target.value }))}
                          placeholder="member@example.com"
                          required
                        />
                      </div>
                      <div>
                        <label className="field-label" htmlFor="member-role">Role</label>
                        <select
                          id="member-role"
                          value={memberInvite.role}
                          onChange={(event) => setMemberInvite((current) => ({ ...current, role: event.target.value }))}
                        >
                          <option value="manager">Manager</option>
                          <option value="accountant">Accountant</option>
                          <option value="staff">Staff</option>
                        </select>
                      </div>
                      <div className="member-invite-action">
                        <button className="manual-button" type="submit" disabled={memberSaving || membersLoading}>
                          {memberSaving ? 'Saving...' : 'Invite Member'}
                        </button>
                      </div>
                    </div>
                  </form>

                  <form className="member-invite-card" onSubmit={handleLinkEmployeeUser}>
                    <div>
                      <h3>Employee Login Access</h3>
                      <p className="panel-hint">Link a registered Supabase user email to one employee profile. Employees get self-service only.</p>
                    </div>
                    <div className="form-grid">
                      <div>
                        <label className="field-label" htmlFor="employee-map-id">Employee</label>
                        <select
                          id="employee-map-id"
                          value={employeeLinkForm.employeeId}
                          onChange={(event) => setEmployeeLinkForm((current) => ({ ...current, employeeId: event.target.value }))}
                          required
                        >
                          <option value="">Select employee</option>
                          {cloudEmployees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.fullName || employee.full_name || employee.name || employee.id}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="field-label" htmlFor="employee-map-email">Employee Login Email</label>
                        <input
                          id="employee-map-email"
                          type="email"
                          value={employeeLinkForm.email}
                          onChange={(event) => setEmployeeLinkForm((current) => ({ ...current, email: event.target.value }))}
                          placeholder="employee@example.com"
                          required
                        />
                      </div>
                      <div className="member-invite-action">
                        <button className="manual-button" type="submit" disabled={memberSaving || membersLoading}>
                          {memberSaving ? 'Linking...' : 'Link Employee Login'}
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="member-toolbar">
                    <div>
                      <h3>Employee Login Mappings</h3>
                      <p className="panel-hint">{employeeUserMappings.length} linked employee login{employeeUserMappings.length === 1 ? '' : 's'}</p>
                    </div>
                    <button className="secondary-button compact-button" type="button" onClick={refreshEmployeeUserMappings} disabled={memberSaving}>
                      Refresh Mappings
                    </button>
                  </div>

                  <div className="members-table-wrap">
                    <table className="members-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th>Linked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeUserMappings.length === 0 && (
                          <tr>
                            <td colSpan="4"><div className="empty-state">No employee logins linked yet.</div></td>
                          </tr>
                        )}
                        {employeeUserMappings.map((mapping) => {
                          const employee = cloudEmployees.find((item) => item.id === mapping.employeeId);
                          return (
                            <tr key={mapping.id}>
                              <td data-label="Employee">{employee?.fullName || employee?.full_name || employee?.name || mapping.employeeId}</td>
                              <td data-label="Email">{mapping.employeeEmail}</td>
                              <td data-label="Status">{mapping.status}</td>
                              <td data-label="Linked">{mapping.linkedAt || mapping.updatedAt || 'Pending'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="member-toolbar">
                    <div>
                      <h3>Company Members</h3>
                      <p className="panel-hint">{membersLoading ? 'Loading members...' : `${companyMembers.length} member${companyMembers.length === 1 ? '' : 's'} found`}</p>
                    </div>
                    <button className="secondary-button compact-button" type="button" onClick={refreshCompanyMembers} disabled={membersLoading || memberSaving}>
                      Refresh
                    </button>
                  </div>

                  <div className="members-table-wrap">
                    <table className="members-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyMembers.length === 0 && (
                          <tr>
                            <td colSpan="5">
                              <div className="empty-state">No members yet. Invite your first manager, accountant, or staff member.</div>
                            </td>
                          </tr>
                        )}
                        {companyMembers.map((member) => {
                          const isSelf = Boolean(member.userId && member.userId === authUser?.uid);
                          const displayName = member.name || (isSelf ? profile.owner : 'Invited member');
                          const displayEmail = member.email || (isSelf ? authUser?.email : 'Email not available');
                          return (
                            <tr key={member.id}>
                              <td data-label="Name">
                                <strong>{displayName}</strong>
                                {isSelf && <span className="member-self-pill">You</span>}
                              </td>
                              <td data-label="Email">{displayEmail}</td>
                              <td data-label="Role">
                                <select
                                  value={member.role}
                                  disabled={isSelf || memberSaving}
                                  onChange={(event) => handleMemberUpdate(member, { role: event.target.value })}
                                  aria-label={`Change role for ${displayEmail}`}
                                >
                                  <option value="owner">Owner</option>
                                  <option value="manager">Manager</option>
                                  <option value="accountant">Accountant</option>
                                  <option value="staff">Staff</option>
                                </select>
                              </td>
                              <td data-label="Status">
                                <select
                                  value={member.status}
                                  disabled={isSelf || memberSaving}
                                  onChange={(event) => handleMemberUpdate(member, { status: event.target.value })}
                                  aria-label={`Change status for ${displayEmail}`}
                                >
                                  <option value="active">Active</option>
                                  <option value="invited">Invited</option>
                                  <option value="disabled">Disabled</option>
                                </select>
                              </td>
                              <td data-label="Actions">
                                <div className="member-actions">
                                  <button
                                    className="secondary-button compact-button"
                                    type="button"
                                    disabled={isSelf || memberSaving || member.status === 'disabled'}
                                    onClick={() => handleMemberDisable(member)}
                                  >
                                    Disable
                                  </button>
                                  <button
                                    className="danger-button compact-button"
                                    type="button"
                                    disabled={isSelf || memberSaving}
                                    onClick={() => handleMemberRemove(member)}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}

          {activeTab === 'app-settings' && (
            <section className="panel settings-panel fade-in" id="app-settings">
              <div className="section-header">
                <div>
                  <h2>Application Configurations</h2>
                  <p className="panel-hint">Configure system backups, restoration endpoints, and database cleanups.</p>
                </div>
                <span>Admin Settings</span>
              </div>
              <div className="settings-grid">
                <article className="settings-card">
                  <h3>Voice Language</h3>
                  <p>Current recording dialect: <strong>{language}</strong></p>
                  <select
                    id="settings-voice-lang"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    style={{ marginTop: '8px' }}
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-IN">English / Hinglish (India)</option>
                    <option value="hi-IN">Hindi (India)</option>
                    <option value="gu-IN">Gujarati (India)</option>
                  </select>
                </article>
                <article className="settings-card">
                  <h3>Logged-in Account</h3>
                  <p><strong>{authUser?.email || 'No email available'}</strong></p>
                  <p className="panel-hint">User ID: {authUser?.uid || 'Not available'}</p>
                  <p className="panel-hint">Status: {authUser?.emailVerified ? 'Email verified' : 'Email not verified'}</p>
                  <div className="inline-actions">
                    <button className="secondary-button compact-button" type="button" onClick={() => { window.location.hash = 'profile-settings'; }}>
                      Open Profile
                    </button>
                    <button className="secondary-button compact-button" type="button" onClick={() => { window.location.hash = 'user-management'; }}>
                      Users & Roles
                    </button>
                  </div>
                </article>
                <article className="settings-card">
                  <h3>Data Safety & Backups</h3>
                  <p>Download a JSON package of your invoices, settings, and party histories.</p>
                  <button className="secondary-button compact-button" type="button" onClick={downloadFullBackup}>
                    Download Backup JSON
                  </button>
                </article>
                <article className="settings-card">
                  <h3>Database Operations</h3>
                  <p>Restore backups or permanently flush all double-entry voucher tables.</p>
                  <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                    <label className="warning-button restore-label" style={{ margin: 0 }}>
                      Restore Backup
                      <input accept="application/json,.json" hidden type="file" onChange={restoreFullBackup} />
                    </label>
                    <button className="danger-button" style={{ margin: 0, minHeight: '44px' }} type="button" onClick={clearAllData}>
                      Reset All Data
                    </button>
                  </div>
                </article>
                <article className="settings-card">
                  <h3>Legal & Play Store</h3>
                  <p>Review privacy, terms, contact, and account deletion pages required before public launch.</p>
                  <div className="legal-link-grid">
                    <a href="#privacy-policy">Privacy</a>
                    <a href="#terms-conditions">Terms</a>
                    <a href="#data-deletion">Data Deletion</a>
                    <a href="#contact-us">Contact</a>
                    <a href="#about-app">About</a>
                  </div>
                </article>
              </div>
            </section>
          )}

          {activeTab === 'database-test' && canViewDatabaseDebug && (
            <section className="panel fade-in" id="database-test">
              <div className="section-header">
                <div>
                  <span className="eyebrow">Temporary Debug</span>
                  <h2>Database Test</h2>
                  <p className="panel-hint">
                    Direct Supabase write and read-back test for the signed-in user. No app business logic is used.
                  </p>
                </div>
                <span className={`runtime-pill ${supabaseEnabled ? 'live' : 'demo'}`}>
                  {supabaseEnabled ? 'Supabase configured' : 'Supabase missing'}
                </span>
              </div>
              <div className="notice">
                This writes to the Supabase <code>debug_tests</code> table for <code>{`users/${authUser?.uid || 'uid'}/debug/test`}</code>.
                <br />
                Supabase project: <code>{getSupabaseProjectHost() || 'not configured'}</code>
              </div>
              <button
                className="manual-button"
                type="button"
                onClick={runDebugSupabaseTest}
                disabled={!authUser || !supabaseEnabled}
              >
                Run Database Test
              </button>
            </section>
          )}

          {shouldShowRouteFallback && (
            <section className="panel route-fallback-panel fade-in" id="route-fallback">
              <span className="eyebrow">Ready</span>
              <h2>Open a business section</h2>
              <p className="panel-hint">
                This page is available from the menu. Use the quick actions below to continue.
              </p>
              <div className="mobile-quick-grid">
                <a className="manual-button compact-link" href="#dashboard">Dashboard</a>
                <a className="secondary-button compact-link" href="#voucher-entry">Add Voucher</a>
                <a className="secondary-button compact-link" href="#day-book">Day Book</a>
                <a className="secondary-button compact-link" href="#profile-settings">Profile</a>
              </div>
            </section>
          )}
        </main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <a className={activeTab === 'dashboard' ? 'active' : ''} href="#dashboard">Home</a>
        <a className={activeTab === 'voucher-entry' ? 'active' : ''} href="#voucher-entry">Add</a>
        <a className={activeTab === 'day-book' ? 'active' : ''} href="#day-book">Search</a>
        <a className={activeTab === 'profile-settings' ? 'active' : ''} href="#profile-settings">Profile</a>
      </nav>

      {/* Floating Microphone Action Button */}
      <button 
        className={`floating-mic-btn ${status === 'Listening...' ? 'listening' : ''}`}
        onClick={startVoiceRecognition}
        type="button"
        title="Click to record transactions"
      >
        <span className="mic-icon">🎤</span>
        {status === 'Listening...' && <span className="pulse-ring"></span>}
      </button>

      {/* Confirmation Modal Popup backdrop */}
      {voiceConfirmation && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h3>Review Voice Entry</h3>
                <p className="panel-hint">Voice Input / Speech-to-Text / AI Parser / Review / Save</p>
              </div>
              <button className="close-modal-btn" onClick={() => setVoiceConfirmation(null)}>×</button>
            </div>
            <div className={`voice-review-banner ${voiceConfirmation.unclear ? 'warning' : 'ready'}`}>
              <div>
                <span>Transcript</span>
                <strong>{voiceConfirmation.transcript || transcript}</strong>
              </div>
              <div className="confidence-meter">
                <span>Confidence {Math.round((voiceConfirmation.confidence || 0) * 100)}%</span>
                <i><b style={{ width: `${Math.round((voiceConfirmation.confidence || 0) * 100)}%` }} /></i>
              </div>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveVoiceConfirmation(voiceConfirmation);
            }}>
              <div className="form-grid">
                <div>
                  <label className="field-label">Transaction Type</label>
                  <select
                    value={voiceConfirmation.type}
                    onChange={(e) => setVoiceConfirmation({ ...voiceConfirmation, type: e.target.value, confidence: Math.max(voiceConfirmation.confidence || 0, 0.72), unclear: false })}
                  >
                    <option value="income">Income / Sale</option>
                    <option value="expense">Expense / Payment</option>
                    <option value="inventory">Inventory / Purchase</option>
                    <option value="customer_due">Customer Due</option>
                    <option value="payment_received">Payment Received</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Amount (₹)</label>
                  <input
                    type="number"
                    value={voiceConfirmation.amount}
                    onChange={(e) => setVoiceConfirmation({ ...voiceConfirmation, amount: normalizeAmount(e.target.value), confidence: Math.max(voiceConfirmation.confidence || 0, 0.72), unclear: false })}
                    required
                  />
                </div>
                <div className="wide-field">
                  <label className="field-label">Party (Customer / Supplier)</label>
                  <input
                    type="text"
                    placeholder="Enter customer or supplier name"
                    value={voiceConfirmation.partyName || voiceConfirmation.customer || ''}
                    onChange={(e) => setVoiceConfirmation({ ...voiceConfirmation, partyName: sanitizeText(e.target.value, 120), customer: sanitizeText(e.target.value, 120), confidence: Math.max(voiceConfirmation.confidence || 0, 0.72), unclear: false })}
                  />
                  <p className="field-help">New ledger will be created if name is unrecognized.</p>
                </div>
                <div>
                  <label className="field-label">Category / Ledger</label>
                  <select
                    value={voiceConfirmation.category}
                    onChange={(e) => setVoiceConfirmation({ ...voiceConfirmation, category: e.target.value, confidence: Math.max(voiceConfirmation.confidence || 0, 0.72), unclear: false })}
                  >
                    <optgroup label="Direct/Indirect Expenses">
                      <option value="General Expense">General Expense</option>
                      <option value="Material / Purchase">Material / Purchase</option>
                      <option value="Rent">Rent</option>
                    </optgroup>
                    <optgroup label="Revenue">
                      <option value="Sales">Sales</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="field-label">Transaction Date</label>
                  <input
                    type="date"
                    value={voiceConfirmation.date || new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setVoiceConfirmation({ ...voiceConfirmation, date: e.target.value, confidence: Math.max(voiceConfirmation.confidence || 0, 0.72), unclear: false })}
                  />
                </div>
                <div className="wide-field">
                  <label className="field-label">Narration Note</label>
                  <textarea
                    value={voiceConfirmation.narration || voiceConfirmation.notes || ''}
                    onChange={(e) => setVoiceConfirmation({ ...voiceConfirmation, narration: sanitizeText(e.target.value, 300), notes: sanitizeText(e.target.value, 300), confidence: Math.max(voiceConfirmation.confidence || 0, 0.72), unclear: false })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-button" onClick={startVoiceRecognition}>Retry</button>
                <button type="button" className="secondary-button" onClick={() => setVoiceConfirmation(null)}>Cancel</button>
                <button type="submit" className="manual-button">Confirm & Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HIDDEN PRINT LAYOUT */}
      <div className="print-report-layout">
        <div className="print-header">
          {profile.logo && <img src={profile.logo} className="print-logo" alt="Business Logo" />}
          <div className="print-biz-info">
            <h2>{profile.name}</h2>
            <p>{profile.tagline}</p>
            <p>{profile.address}</p>
            <p>GSTIN: {profile.gstin} | Mob: {profile.phone} | Email: {profile.email}</p>
          </div>
        </div>
        
        <hr className="print-divider" />
        
        <div className="print-meta-section">
          <h3>
            {activeReportTab === 'pnl' ? 'Profit & Loss Statement' : 
             activeReportTab === 'daybook' ? 'Day Book Report' : 
             activeReportTab === 'cashbook' ? 'Cash Book Statement' : 
             activeReportTab === 'customer' ? 'Customer Outstanding Statement' : 
             'Supplier Outstanding Statement'}
          </h3>
          <p>Report Period: {dayBookFromDate} to {dayBookToDate} | Generated: {new Date().toLocaleString()} | Owner: {profile.owner}</p>
        </div>

        {activeReportTab === 'pnl' && (
          <div className="print-pnl-sheet">
            <table className="statement-table font-mono">
              <thead>
                <tr>
                  <th>Particulars</th>
                  <th>Debit (Dr)</th>
                  <th>Credit (Cr)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Sales Accounts (Revenue)</strong></td>
                  <td>—</td>
                  <td>{formatCurrency(pnlData.sales)}</td>
                </tr>
                <tr>
                  <td>Less: Cost of Material / Purchases</td>
                  <td>{formatCurrency(pnlData.purchases)}</td>
                  <td>—</td>
                </tr>
                <tr className="subtotal-row">
                  <td><strong>Gross Profit</strong></td>
                  <td>—</td>
                  <td><strong>{formatCurrency(pnlData.grossProfit)}</strong></td>
                </tr>
                <tr>
                  <td>Less: Rent Expenses</td>
                  <td>{formatCurrency(pnlData.rent)}</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Less: General Indirect Expenses</td>
                  <td>{formatCurrency(pnlData.general)}</td>
                  <td>—</td>
                </tr>
                <tr className="total-row">
                  <td><strong>Net Profit (Surplus)</strong></td>
                  <td>—</td>
                  <td><strong>{formatCurrency(pnlData.netProfit)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeReportTab === 'daybook' && (
          <table className="statement-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher ID</th>
                <th>Type</th>
                <th>Particulars (Counter)</th>
                <th>Narration</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {vouchers
                .filter(v => v.date >= dayBookFromDate && v.date <= dayBookToDate)
                .map(v => (
                  <tr key={v.id}>
                    <td>{v.date}</td>
                    <td>{v.id.slice(0, 10)}</td>
                    <td>{v.type}</td>
                    <td>{counterLabel(v)}</td>
                    <td>{v.narration}</td>
                    <td>{formatCurrency(v.amount)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {activeReportTab === 'cashbook' && (
          <table className="statement-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Particulars</th>
                <th>Type</th>
                <th>Receipts (Dr)</th>
                <th>Payments (Cr)</th>
                <th>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {cashBookData.rows
                .filter(r => r.date >= dayBookFromDate && r.date <= dayBookToDate)
                .map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.date}</td>
                    <td>{r.particulars}</td>
                    <td>{r.type}</td>
                    <td>{r.debit ? formatCurrency(r.debit) : '—'}</td>
                    <td>{r.credit ? formatCurrency(r.credit) : '—'}</td>
                    <td>{formatCurrency(r.balance)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {activeReportTab === 'customer' && (
          <table className="statement-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Total Invoiced Sales</th>
                <th>Total Receipts</th>
                <th>Outstanding Receivable Balance</th>
                <th>Last Active Date</th>
              </tr>
            </thead>
            <tbody>
              {partySummary
                .filter(p => p.group === 'Sundry Debtors' && p.outstandingAmount > 0)
                .map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{formatCurrency(p.totalSales)}</td>
                    <td>{formatCurrency(p.totalPayments)}</td>
                    <td><strong>{formatCurrency(p.outstandingAmount)}</strong></td>
                    <td>{p.lastTransactionDate}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {activeReportTab === 'supplier' && (
          <table className="statement-table">
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Total Invoiced Purchases</th>
                <th>Total Payments Made</th>
                <th>Outstanding Payable Balance</th>
                <th>Last Active Date</th>
              </tr>
            </thead>
            <tbody>
              {partySummary
                .filter(p => p.group === 'Sundry Creditors' && p.outstandingAmount > 0)
                .map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{formatCurrency(p.totalSales)}</td>
                    <td>{formatCurrency(p.totalPayments)}</td>
                    <td><strong>{formatCurrency(Math.abs(p.outstandingAmount))}</strong></td>
                    <td>{p.lastTransactionDate}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        <div className="print-signature-area">
          <div className="signature-line">
            <span>Authorized Signatory</span>
          </div>
        </div>
        
        <div className="print-footer">
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}

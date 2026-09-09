import { useVoiceManager } from './hooks/useVoiceManager';
import { useIsMobile } from './hooks/useIsMobile';
import PreferencesPanel from './PreferencesPanel.jsx';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Activity, ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, 
  TrendingUp, Users, Package, FileText, Bell, CheckSquare, 
  Clock, Plus, Minus, ShoppingBag, Truck, Search, Settings, HelpCircle, 
  LogOut, User, ChevronDown, Calendar, Lightbulb, CheckCircle, AlertCircle,
  CalendarDays, Gift, Briefcase, MapPin, Star, Sparkles, TrendingDown, Sun, Cloud,
  Filter, Tag, Download, Phone, Mail, MessageCircle, MoreHorizontal, Paperclip, Edit3, ArrowLeft, Image as ImageIcon, X
} from 'lucide-react';
import { SafeHelpCenterModal } from './SafeHelpCenterModal';
import StorefrontHome from './storefront/StorefrontHome.jsx';
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
  createVoucherId,
  DEFAULT_LEDGERS,
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
  writeSavedArray,
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
  normalizeTransaction,
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
import VoiceCommandButton from './VoiceCommandButton.jsx';

const Phase2ERP = lazy(() => import('./Phase2ERP.jsx'));
const Phase3Ops = lazy(() => import('./Phase3Ops.jsx'));
const ProfitNxSalesEntry = lazy(() => import('./ProfitNxSalesEntry.jsx'));
const ProfitNxProduction = lazy(() => import('./ProfitNxProduction.jsx'));

const STORAGE_KEY = 'businessLogs';
const PROFILE_KEY = 'businessProfile';
const AUTH_KEY = 'voiceBusinessTrackerAuth';
const INVENTORY_KEY = 'businessInventory';
const ORDERS_KEY = 'businessOrders';
const VOICE_ALERTS_KEY = 'voiceLowStockAlertsEnabled';
const DEFAULT_PROFILE = {
  name: 'Jay Ambe Namkeen',
  tagline: 'Authentic Namkeen & Farsan Manufacturer & Wholesaler',
  logo: '/assets/trinetr-logo.jpg',
  owner: 'Jay Ambe Namkeen',
  email: 'trinetr1901@gmail.com',
  phone: '+918488943771',
  address: 'Plot No. 12, GIDC Industrial Estate, Gujarat, India',
  gstin: '24CPVPC7753J1Z8',
  financialYear: '2026-2027',
  storeName: 'Jay Ambe Namkeen Store',
  storeTagline: 'Fresh & Authentic Homemade Snacks & Delicacies',
  whatsapp: '+918488943771',
  fssaiNumber: '10722026001234',
  hours: 'Mon - Sun: 9:00 AM - 10:00 PM',
  bannerOffer: 'FLAT 20% OFF',
  bannerRegion: "For All Gujarat and Mumbai City's Customers",
  upiId: 'trinetr.namkeen@icici',
};

const DEFAULT_PREFERENCES = {
  themeMode: "light",
  compactMode: false,
  largeText: false,
  defaultLandingPage: "dashboard",
  showWelcomeMessage: true,
  showWeatherCard: true,
  showAgendaCard: true,
  defaultPaymentMode: "cash",
  defaultVoucherType: "receipt",
  enableVoiceShortcut: true,
  confirmBeforeSavingVoucher: true,
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  numberFormat: "indian",
  paymentReminder: true,
  lowStockAlert: true,
  attendanceReminder: false,
  dailySummary: false,
  autoLogout: "never",
  hideFinancialValues: false,
  confirmBeforeDelete: true
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
  'sales-entry',
  'production',
  'store',
  'shop',
  'product-menu',
  'categories',
  'store-contact',
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
  'entries',
  'parties',
  'stock',
  'more',
  'storefront',
  'profile',
  'billing',
  'preferences',
  'help',
  'help-center',
  ...LEGAL_PAGE_IDS,
];
const navigationConfig = [
  {
    id: 'transaction',
    label: '1. Transaction',
    icon: '⚡',
    children: [
      { id: 'sales-entry', path: '#sales-entry', tab: 'sales-entry', label: 'Sales Entry (F2)', icon: '⚡' },
      { id: 'voucher-entry', path: '#voucher-entry', tab: 'voucher-entry', label: 'Voucher Entry (Purchase, Cash & Bank)', icon: '▣' },
      { id: 'invoices', path: '#invoices', tab: 'invoices', label: 'Tax Invoices Register', icon: '▧' },
      { id: 'payments', path: '#upi-payments', tab: 'upi-payments', label: 'Payments & UPI', icon: '▥' },
      { id: 'day-book', path: '#day-book', tab: 'day-book', label: 'Day Book (Daily Log)', icon: '☷' },
      { id: 'inventory-inward', path: '#inventory', tab: 'inventory', label: 'Stock & Inventory Management', icon: '⬢' },
      { id: 'orders', path: '#orders', tab: 'orders', label: 'Storefront Orders', icon: '🛒' },
    ],
  },
  {
    id: 'reports-menu',
    label: '2. Reports',
    icon: '▱',
    children: [
      { id: 'sales-reg', path: '#sales-entry', tab: 'sales-entry', label: 'Sales Register & GST', icon: '⚡' },
      { id: 'day-book-rep', path: '#day-book', tab: 'day-book', label: 'Day Book', icon: '☷' },
      { id: 'party-statement', path: '#party-statement', tab: 'party-statement', label: 'Party Statement / Ledger', icon: '▤' },
      { id: 'gst', path: '#gst', tab: 'gst', label: 'GST Center & Returns', icon: '◇' },
      { id: 'reports', path: '#reports', tab: 'reports', label: 'Business Reports Summary', icon: '▱' },
      { id: 'reports-hub', path: '#reports-hub', tab: 'reports-hub', label: 'Advanced Reports Hub', icon: '⌁' },
      { id: 'accounting-ledgers', path: '#accounting-ledgers', tab: 'accounting-ledgers', label: 'Accounting Ledgers', icon: '▦' },
      { id: 'vouchers-hub', path: '#vouchers-hub', tab: 'vouchers-hub', label: 'Voucher Types Register', icon: '▣' },
    ],
  },
  {
    id: 'analytics-menu',
    label: '3. Analytics',
    icon: '⌁',
    children: [
      { id: 'analytics', path: '#analytics', tab: 'analytics', label: 'Business Analytics & Insights', icon: '⌁' },
      { id: 'ai-insights', path: '#ai-assistant', tab: 'ai-assistant', label: 'AI Business Assistant', icon: '✣' },
      { id: 'voice-bookkeeper', path: '#voice-bookkeeper', tab: 'voice-bookkeeper', label: 'Voice Bookkeeper', icon: '🎙️' },
    ],
  },
  {
    id: 'process-menu',
    label: '4. Process',
    icon: '◈',
    children: [
      { id: 'masters', path: '#masters', tab: 'masters', label: 'Masters Management', icon: '◈' },
      { id: 'company-setup', path: '#company-setup', tab: 'company-setup', label: 'Company Setup & FY', icon: '▦' },
      { id: 'businesses', path: '#businesses', tab: 'businesses', label: 'Multi-Business / Branches', icon: '⌖' },
      { id: 'cloud-backup', path: '#cloud-backup', tab: 'cloud-backup', label: 'Cloud Backup & Restore', icon: '⎇' },
      { id: 'security-center', path: '#security-center', tab: 'security-center', label: 'Security & Audit Center', icon: '◇' },
      { id: 'user-management', path: '#user-management', tab: 'user-management', label: 'Users & Permissions', icon: '♙' },
      { id: 'accountant-portal', path: '#accountant-portal', tab: 'accountant-portal', label: 'Accountant Portal', icon: '☷' },
    ],
  },
  {
    id: 'production-menu',
    label: '5. Production',
    icon: '⚙',
    children: [
      { id: 'production', path: '#production', tab: 'production', label: 'Batch Production Run & BOM', icon: '⚙' },
      { id: 'production-stock', path: '#inventory', tab: 'inventory', label: 'Raw Materials & Finished Stock', icon: '⬢' },
    ],
  },
  {
    id: 'payroll-menu',
    label: '6. Payroll',
    icon: '👥',
    children: [
      { id: 'employees', path: '#employees', tab: 'employees', label: 'Employee Master & HRMS', icon: '👥' },
    ],
  },
  {
    id: 'master-menu',
    label: '7. Master',
    icon: '☉',
    children: [
      { id: 'customers', path: '#crm', tab: 'crm', label: 'Customer Master', icon: '☉' },
      { id: 'suppliers', path: '#suppliers', tab: 'suppliers', label: 'Supplier Master', icon: '◎' },
      { id: 'inventory', path: '#inventory', tab: 'inventory', label: 'Product & Stock Master', icon: '⬢' },
      { id: 'whatsapp-automation', path: '#whatsapp-automation', tab: 'whatsapp-automation', label: 'WhatsApp Automation', icon: '⚡' },
      { id: 'system-settings', path: '#app-settings', tab: 'app-settings', label: 'Company Profile & Settings', icon: '⚙' },
      { id: 'database-test', path: '#database-test', tab: 'database-test', label: 'Database Diagnostics', icon: '◉', debugOnly: true },
    ],
  },
  {
    id: 'overview-menu',
    label: 'TRINETR Dashboard',
    icon: '⌂',
    children: [
      { id: 'dashboard', path: '#dashboard', tab: 'dashboard', label: 'Dashboard Overview', icon: '⌂' },
      { id: 'notifications', path: '#notifications', tab: 'notifications', label: 'Notifications Center', icon: '◌' },
    ],
  },
  {
    id: 'storefront-menu',
    label: '🛍️ Online Store',
    icon: '🛍️',
    children: [
      { id: 'storefront', path: '#store', tab: 'store', label: 'Customer Storefront (Live)', icon: '🛍️' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    icon: 'User',
    children: [
      { id: 'profile', path: '#profile', tab: 'profile', label: 'My Profile', hidden: true },
      { id: 'billing', path: '#billing', tab: 'billing', label: 'Billing & Plans', hidden: true },
      { id: 'preferences', path: '#preferences', tab: 'preferences', label: 'Preferences', hidden: true },
      { id: 'help', path: '#help', tab: 'help', label: 'Help Center', hidden: true },
    ]
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
    let scoped = {};
    try {
      scoped = JSON.parse(readScopedString(PROFILE_KEY) || '{}');
    } catch {}
    let localSaved = {};
    try {
      const raw = localStorage.getItem('businessProfile');
      if (raw) localSaved = JSON.parse(raw);
    } catch {}
    return { ...DEFAULT_PROFILE, ...localSaved, ...scoped };
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

const checkLimit = (feature, currentCount, onSuccess) => { if (onSuccess) onSuccess(); return true; };

const safeMoney = (val) => { const n = Number(val); return Number.isFinite(n) ? n : 0; };
const safeTrackEvent = (...args) => {
  try {
    if (typeof window !== 'undefined' && typeof window.trackEvent === 'function') {
      window.trackEvent(...args);
    }
  } catch (e) {
    console.warn("Tracking failed:", e);
  }
};
const trackEvent = safeTrackEvent;

const safeTrackPageView = (...args) => {
  try {
    if (typeof window !== 'undefined' && typeof window.trackPageView === 'function') {
      window.trackPageView(...args);
    }
  } catch (e) {
    console.warn("Tracking page view failed:", e);
  }
};
const trackPageView = safeTrackPageView;

const searchRoutes = [
  { id: 'dashboard', label: 'Dashboard', route: 'dashboard', aliases: ['home'] },
  { id: 'customers', label: 'Customers', route: 'crm', aliases: ['customer'] },
  { id: 'suppliers', label: 'Suppliers', route: 'suppliers', aliases: ['supplier'] },
  { id: 'employees', label: 'Employees', route: 'employees', aliases: ['staff', 'employee'] },
  { id: 'party-management', label: 'Party Management', route: 'party-management', aliases: ['crm', 'party'] },
  { id: 'party-ledger', label: 'Party Ledger', route: 'party-statement', aliases: ['ledger'] },
  { id: 'voucher-entry', label: 'Voucher Entry (Purchase, Expense, Cash & Bank)', route: 'voucher-entry', aliases: ['voucher', 'receipt', 'payment', 'purchase', 'expense', 'supplier bill'] },
  { id: 'day-book', label: 'Day Book', route: 'day-book', aliases: ['transactions'] },
  { id: 'inventory', label: 'Inventory', route: 'inventory', aliases: ['stock', 'product', 'products'] },
  { id: 'orders', label: 'Orders', route: 'orders', aliases: ['order'] },
  { id: 'invoices', label: 'Invoices', route: 'invoices', aliases: ['invoice', 'bill', 'billing'] },
  { id: 'reports', label: 'Reports', route: 'reports', aliases: ['report'] },
  { id: 'analytics', label: 'Analytics', route: 'analytics', aliases: [] },
  { id: 'settings', label: 'Settings', route: 'app-settings', aliases: [] },
  { id: 'company-setup', label: 'Company Setup', route: 'company-setup', aliases: ['company'] },
  { id: 'voice-bookkeeper', label: 'Voice Bookkeeper', route: 'voice-bookkeeper', aliases: ['voice', 'mic'] },
];

function GlobalSearch({ onNavigate, theme }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const results = searchRoutes.filter(r => 
    r.label.toLowerCase().includes(query.toLowerCase()) || 
    r.id.toLowerCase().includes(query.toLowerCase()) ||
    (r.aliases && r.aliases.some(alias => alias.toLowerCase().includes(query.toLowerCase())))
  );

  const handleSelect = (route) => {
    console.log("[GlobalSearch] result clicked", searchRoutes.find(r => r.route === route));
    console.log("[GlobalSearch] navigating to", route);
    setQuery('');
    setIsOpen(false);
    onNavigate(route);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0].route);
    }
  };

  return (
    <div className={`search-wrapper ${isDark ? 'theme-dark' : ''}`} style={{ position: 'relative', width: '100%', maxWidth: isDark ? '280px' : '480px' }}>
      <Search size={15} className="search-icon" style={{ pointerEvents: 'none', color: isDark ? '#94a3b8' : undefined, left: '10px' }} />
      <input 
        ref={inputRef}
        type="text" 
        placeholder="Search..." 
        aria-label="Search business records"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        style={{
          paddingRight: query ? '32px' : '14px',
          paddingLeft: '32px',
          height: isDark ? '32px' : '40px',
          fontSize: isDark ? '12.5px' : '14px',
          background: isDark ? 'rgba(255, 255, 255, 0.12)' : undefined,
          color: isDark ? '#ffffff' : undefined,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : undefined,
          borderRadius: '6px'
        }}
      />
      <div
        className="search-shortcut hide-on-mobile"
        style={isDark ? { background: 'rgba(255, 255, 255, 0.18)', color: '#e2e8f0', borderColor: 'rgba(255, 255, 255, 0.25)', fontSize: '10.5px', padding: '1px 5px', right: '8px' } : undefined}
      >
        Ctrl + K
      </div>
      {query && (
        <button 
          type="button"
          onClick={() => { setQuery(''); inputRef.current?.focus(); }}
          style={{ position: 'absolute', right: '48px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#cbd5e1' : '#999', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={14} />
        </button>
      )}

      {isOpen && query && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#ffffff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 9999, maxHeight: '300px', overflowY: 'auto', border: '1px solid #cbd5e1' }}>
          {results.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: '6px 0', margin: 0 }}>
              {results.map((r) => (
                <li key={r.id}>
                  <button 
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(r.route); }}
                    onClick={() => handleSelect(r.route)}
                    style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#0f172a', fontSize: '13.5px', fontWeight: 600, transition: 'background 0.15s' }}
                    className="saas-dropdown-item"
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: '14px', textAlign: 'center', color: '#475569', fontSize: '13px', fontWeight: 600 }}>
              No matching page found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VoiceExpenseTrackerPreview() {
  const isMobile = useIsMobile();
  // Auto-complete setup to prevent modals from showing
  if (typeof window !== 'undefined') {
    if (!localStorage.getItem('workspaceSetupCompleted')) {
      localStorage.setItem('workspaceSetupCompleted', 'true');
      localStorage.setItem('onboardingCompleted', 'true');
      localStorage.setItem('setupCompleted', 'true');
      try {
        // Attempt to update settings table if possible but don't block
        const safeSave = async () => {
          if (window.supabase) {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (session?.user) {
              await window.supabase.from('settings').upsert({
                user_id: session.user.id,
                data: { workspaceSetupCompleted: true, onboardingCompleted: true, setupCompleted: true },
                updated_at: new Date().toISOString()
              });
            }
          }
        };
        safeSave();
      } catch (e) {
        console.warn('Silent settings update failed', e);
      }
    }
  }

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
      let storedUser = null;
      try {
        storedUser = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
        if (storedUser?.uid || storedUser?.email) {
          setStorageScope(storedUser.uid || storedUser.email);
        }
      } catch (e) {
        console.error("Auth key parse error", e);
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
  const [ledgers, setLedgers] = useState(() => {
    try {
      const saved = ensureDefaultLedgers();
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    return DEFAULT_LEDGERS;
  });
  const [vouchers, setVouchers] = useState(() => {
    try {
      const local = readVouchers();
      if (Array.isArray(local) && local.length > 0) return local;
    } catch {}
    return [];
  });

  useEffect(() => {
    if (Array.isArray(vouchers)) {
      writeSavedArray(VOUCHERS_KEY, vouchers);
    }
  }, [vouchers]);

  const [cloudCustomers, setCloudCustomers] = useState(() => {
    try {
      const raw = readScopedString('erpCustomers');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    const local = readSavedArray('erpCustomers');
    return Array.isArray(local) ? local : [];
  });

  const [cloudSuppliers, setCloudSuppliers] = useState(() => {
    try {
      const raw = readScopedString('erpSuppliers');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    const local = readSavedArray('erpSuppliers');
    return Array.isArray(local) ? local : [];
  });

  const [cloudInventory, setCloudInventory] = useState([]);

  const [cloudInvoices, setCloudInvoices] = useState(() => {
    try {
      const raw = readScopedString('erpInvoices');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    const local = readSavedArray('erpInvoices');
    return Array.isArray(local) ? local : [];
  });

  useEffect(() => {
    if (Array.isArray(cloudCustomers)) {
      writeScopedString('erpCustomers', JSON.stringify(cloudCustomers));
    }
  }, [cloudCustomers]);

  useEffect(() => {
    if (Array.isArray(cloudSuppliers)) {
      writeScopedString('erpSuppliers', JSON.stringify(cloudSuppliers));
    }
  }, [cloudSuppliers]);

  useEffect(() => {
    if (Array.isArray(cloudInvoices)) {
      writeScopedString('erpInvoices', JSON.stringify(cloudInvoices));
    }
  }, [cloudInvoices]);

  useEffect(() => {
    const handlePartyUpdate = (event) => {
      const { person, kind } = event.detail || {};
      if (person?.name) {
        try {
          const { ledgers: nextL } = addPartyLedger(person.name, kind || (person.type === 'supplier' ? 'supplier' : 'customer'));
          setLedgers(nextL);
          if (kind === 'supplier') {
            setCloudSuppliers((prev) => [person, ...(Array.isArray(prev) ? prev.filter((s) => s.id !== person.id) : [])]);
          } else {
            setCloudCustomers((prev) => [person, ...(Array.isArray(prev) ? prev.filter((c) => c.id !== person.id) : [])]);
          }
        } catch (e) {}
      }
    };
    window.addEventListener('trinetr-party-updated', handlePartyUpdate);
    return () => window.removeEventListener('trinetr-party-updated', handlePartyUpdate);
  }, []);
  const [cloudStockTransactions, setCloudStockTransactions] = useState([]);
  const [cloudOrders, setCloudOrders] = useState(() => {
    const local = readSavedArray(ORDERS_KEY);
    if (local && local.length > 0) return local;
    const p3 = readSavedArray('phase3Orders');
    return Array.isArray(p3) ? p3 : [];
  });

  useEffect(() => {
    const handleNewStoreOrder = (event) => {
      const newOrder = event?.detail;
      if (!newOrder) return;
      setCloudOrders((prev) => [newOrder, ...(Array.isArray(prev) ? prev.filter(o => o.id !== newOrder.id) : [])]);
      setStatus(`New Online Store Order: ${newOrder.orderNo} from ${newOrder.customer} (₹${newOrder.amount})`);
      if (supabaseEnabled && saveAuthenticatedCloudRecord) {
        saveAuthenticatedCloudRecord('orders', newOrder.id, newOrder).catch(console.error);
      }
    };
    window.addEventListener('trinetr-new-order', handleNewStoreOrder);
    return () => window.removeEventListener('trinetr-new-order', handleNewStoreOrder);
  }, [supabaseEnabled]);
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
  const [profile, setProfile] = useState(() => readProfile());
  const getActiveBusinessId = () => {
    return (
      (typeof selectedBusiness !== 'undefined' ? selectedBusiness?.id : null) ||
      (typeof activeBusiness !== 'undefined' ? activeBusiness?.id : null) ||
      (typeof userProfile !== 'undefined' ? userProfile?.active_business_id : null) ||
      (typeof authUser !== 'undefined' ? (authUser?.businessId || authUser?.active_business_id) : null) ||
      (typeof profile !== 'undefined' ? profile?.active_business_id : null) ||
      (typeof cloudBusinesses !== 'undefined' && cloudBusinesses?.length > 0 ? cloudBusinesses[0]?.id : null) ||
      (typeof readScopedString === 'function' ? readScopedString('activeBusinessId') : null) ||
      'default'
    );
  };
  const activeBusinessId = getActiveBusinessId();

  const [showTour, setShowTour] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState(null); // null means hidden, string means feature name

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
  const [voucherFormError, setVoucherFormError] = useState('');
  const [voucherFormSuccess, setVoucherFormSuccess] = useState('');
  const [voucherFilterType, setVoucherFilterType] = useState('All');

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

  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [aiAnswer, setAiAnswer] = useState('Ask about profit, loss, cash balance, party balance, or type a calculation.');
  const [userPreferences, setUserPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('trinetr_user_preferences');
      let prefs = saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
      if (prefs.themeMode !== 'light') {
        prefs.themeMode = 'light';
        localStorage.setItem('trinetr_user_preferences', JSON.stringify(prefs));
      }
      return prefs;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    let hash = window.location.hash.slice(1);
    if (hash === 'storefront') hash = 'store';
    if (hash === 'help-center') hash = 'help';
    return APP_TABS.includes(hash) ? hash : (userPreferences.defaultLandingPage || 'dashboard');
  });

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showShareStoreModal, setShowShareStoreModal] = useState(false);
  const [storeLinkCopied, setStoreLinkCopied] = useState(false);

  const navigateToTab = (tab) => {
    let target = tab;
    if (target === 'storefront') target = 'store';
    if (target === 'help-center') target = 'help';
    if (target === 'party-management' || target === 'parties') target = 'crm';
    setActiveTab(target);
    window.location.hash = target;
    setQuickAddOpen(false);
    setProfileDropdownOpen(false);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const root = document.documentElement;
    
    // Force light theme permanently
    root.classList.add('theme-light');
    root.classList.remove('theme-dark');
    document.body.classList.remove('dark');
    
    if (userPreferences.compactMode) root.classList.add('compact-mode');
    else root.classList.remove('compact-mode');

    if (userPreferences.largeText) root.classList.add('large-text-mode');
    else root.classList.remove('large-text-mode');
  }, [userPreferences.themeMode, userPreferences.compactMode, userPreferences.largeText]);

  // Listen for preference updates from other components
  useEffect(() => {
    const handlePreferencesUpdate = (e) => {
      if (e.detail) {
        setUserPreferences(prev => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('trinetr-preferences-updated', handlePreferencesUpdate);
    
    // Also listen for system theme changes if set to system
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (userPreferences.themeMode === 'system') {
        setUserPreferences(prev => ({ ...prev })); // trigger re-render
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      window.removeEventListener('trinetr-preferences-updated', handlePreferencesUpdate);
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [userPreferences.themeMode]);

  // Listen for profile updates from Storefront or Settings
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      if (e.detail) {
        setProfile(prev => ({ ...prev, ...e.detail }));
      } else {
        setProfile(readProfile());
      }
    };
    window.addEventListener('trinetr-profile-updated', handleProfileUpdate);
    const handleStorageChange = (e) => {
      if (e.key === 'businessProfile') {
        setProfile(readProfile());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('trinetr-profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  const [voiceConfirmation, setVoiceConfirmation] = useState(null);

  const { state, waveRef, startListening, stopListening, error } = useVoiceManager({
    activeBusinessId: authUser?.businessId,
    onCommandParsed: (parsed) => setVoiceConfirmation(parsed)
  });

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
  const [openNxMenu, setOpenNxMenu] = useState(null);
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
    'sales-entry',
    'production',
    'dashboard',
    'entries',
    'parties',
    'stock',
    'more',
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
    'profile',
    'billing',
    'preferences',
    'help',
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
    if (!supabaseEnabled || !authUser?.uid || !isCompanyOwner || authUser?.mode === 'demo' || authUser?.uid === 'demo-user') {
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
    if (!supabaseEnabled || !authUser?.uid || !isCompanyOwner || authUser?.mode === 'demo' || authUser?.uid === 'demo-user') {
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
      let hash = window.location.hash.slice(1);
      if (hash === 'storefront') hash = 'store';
      if (hash === 'help-center') hash = 'help';
      if (hash === 'party-management' || hash === 'parties') hash = 'crm';
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
    const localVouchers = readVouchers();
    const initialVouchers = sortVouchersNewestFirst(
      Array.isArray(cloudTransactions) && cloudTransactions.length > 0
        ? cloudTransactions
        : Array.isArray(localVouchers) && localVouchers.length > 0
          ? localVouchers
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
            businessId: mapping.businessId,
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
        ] = (await Promise.allSettled([
          loadEmployeeCollection('employees'),
          loadEmployeeCollection('attendance'),
          loadEmployeeCollection('leave_balances'),
          loadEmployeeCollection('leave_requests'),
          loadEmployeeCollection('holidays'),
          loadEmployeeCollection('salary_history'),
          loadEmployeeCollection('payslips'),
          loadEmployeeCollection('employee_documents'),
        ])).map(res => res.status === 'fulfilled' ? res.value : { ok: false, rows: [] });
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
      ] = (await Promise.allSettled([
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
      ])).map(res => res.status === 'fulfilled' ? res.value : { ok: false, rows: [] });
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
        if (typeof trackEvent === 'function') {
          trackEvent('SUPABASE_LOAD_FAILURE', { table: firstFailure.tableName });
        }
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
          normalizeTransaction({ data: { ...data, id } }) || { ...data, id },
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
    const payload = {
      ...data,
      userId: authUser?.uid || 'local-user',
    };
    updateCloudRecordCache(collectionName, id, payload);

    if (!supabaseEnabled || !authUser?.uid) {
      return true;
    }

    try {
      const saved = await saveCloudRecord(authUser.uid, collectionName, id, payload);
      return saved;
    } catch (error) {
      console.warn('Cloud data save failed, kept in local cache:', error);
      return true;
    }
  };

  const uploadAuthenticatedHrmsDocument = async ({ employeeId, businessId, category, file }) => {
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
    removeCloudRecordCache(collectionName, id);

    if (!supabaseEnabled || !authUser?.uid) {
      return true;
    }

    try {
      const deleted = await deleteCloudRecord(authUser.uid, collectionName, id);
      return deleted;
    } catch (error) {
      console.warn('Cloud data delete failed, removed from local cache:', error);
      return true;
    }
  };

  const handleInviteMember = async (event) => {
    const targetForm = event.currentTarget;
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
        businessId: null,
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
    const targetForm = event.currentTarget;
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
        businessId: null,
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
        businessId: null,
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
    const targetForm = event.currentTarget;
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = sanitizeEmail(form.get('email')).toLowerCase().trim();
    const password = String(form.get('password') || '');
    const businessName = sanitizeText(form.get('businessName') || profile.name, 140);
    const ownerName = sanitizeText(form.get('ownerName') || profile.owner, 120);
    const gstin = sanitizeText(form.get('gstin') || '', 20).toUpperCase().replace(/\s+/g, '');

    if (!validateEmail(email)) {
      setSecureError('Enter a valid email address.');
      return;
    }

    if (!validatePassword(password)) {
      setSecureError('Password must be at least 8 characters.');
      return;
    }

    // Retailer GSTIN requirement
    const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstin) {
      setSecureError('GST number is required. Only verified retailers with a valid 15-digit GSTIN can log in. Customers can directly access the online store without GST.');
      return;
    }

    if (!GSTIN_REGEX.test(gstin)) {
      setSecureError('Invalid GSTIN format. Please enter a valid 15-character GST number (e.g. 24CPVPC7753J1Z8).');
      return;
    }

    setAuthLoading(true);
    setSecureError('');
    setAuthNotice('');

    // Update active business GSTIN
    setProfile(prev => ({ ...prev, gstin }));
    try {
      const savedProfile = JSON.parse(localStorage.getItem('businessProfile') || '{}');
      savedProfile.gstin = gstin;
      localStorage.setItem('businessProfile', JSON.stringify(savedProfile));
    } catch {}

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
        gstin,
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
        gstin: profile.gstin || '24CPVPC7753J1Z8',
        role: 'Owner',
        provider: 'Demo',
        emailVerified: true,
        loginAt: new Date().toISOString(),
        mode: 'demo',
      };
      await applyAuthenticatedUser(nextUser, { restoreCloud: false });
      const sampleInvoices = [
        {
          id: 'inv-demo-001',
          invoiceNo: 'INV-2026-001',
          date: new Date().toISOString().slice(0, 10),
          customer: 'Radhe Shyam Traders',
          phone: '9876543210',
          total: 12500,
          balance: 12500,
          paidAmount: 0,
          status: 'Unpaid',
          items: [{ name: 'Nylon Sev 500g', qty: 50, rate: 250 }]
        },
        {
          id: 'inv-demo-002',
          invoiceNo: 'INV-2026-002',
          date: new Date().toISOString().slice(0, 10),
          customer: 'Krishna Provision Store',
          phone: '9876501234',
          total: 8400,
          balance: 8400,
          paidAmount: 0,
          status: 'Unpaid',
          items: [{ name: 'Ratlami Sev 1kg', qty: 28, rate: 300 }]
        }
      ];
      setCloudInvoices(sampleInvoices);
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
      trackEvent('Login successful');
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
    const targetForm = event.currentTarget;
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
    const targetForm = event.currentTarget;
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
    setLedgers(ensureDefaultLedgers());
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

  const refreshVouchers = () => {
    const stored = readVouchers();
    if (Array.isArray(stored)) {
      setVouchers(stored);
    }
  };

  const persistVoucher = async (voucher) => {
    if (!requireSensitiveAccess('voucher saving')) {
      return false;
    }

    if (authUser?.uid) {
      const debitLine = (voucher.lines || []).find((line) => Number(line.debit) > 0) || {};
      const creditLine = (voucher.lines || []).find((line) => Number(line.credit) > 0) || {};

      const transactionPayload = {
        ...voucher,
        transactionId: voucher.id,
        transaction_id: voucher.id,
        userId: authUser.uid,
        user_id: authUser.uid,
        type: 'voucher',
        voucher_type: voucher.type || 'Journal',
        date: voucher.date,
        amount: voucher.amount || Number(debitLine.debit || 0),
        cash_bank: (voucher.type === 'Receipt' ? debitLine.ledgerId : voucher.type === 'Payment' ? creditLine.ledgerId : null) || '',
        debit_account: debitLine.ledgerId || '',
        credit_account: creditLine.ledgerId || '',
        party_id: (voucher.type === 'Receipt' ? creditLine.ledgerId : voucher.type === 'Payment' ? debitLine.ledgerId : null) || '',
        party_name: (voucher.type === 'Receipt' ? (ledgers.find(l => l.id === creditLine.ledgerId)?.name || '') : voucher.type === 'Payment' ? (ledgers.find(l => l.id === debitLine.ledgerId)?.name || '') : ''),
        display_debit_account: ledgers.find(l => l.id === debitLine.ledgerId)?.name || '',
        display_credit_account: ledgers.find(l => l.id === creditLine.ledgerId)?.name || '',
        narration: voucher.narration || '',
        company_id: activeBusinessId,
        business_id: activeBusinessId,
        created_at: voucher.date ? `${voucher.date}T12:00:00.000Z` : new Date().toISOString()
      };

      try {
        if (saveAuthenticatedCloudRecord) {
          await saveAuthenticatedCloudRecord('transactions', voucher.id, transactionPayload).catch((err) => {
            console.warn('Cloud save error in persistVoucher:', err);
          });
        }
      } catch (error) {
        console.warn('Supabase cloud transaction save failed; continuing with local storage:', error);
      }
    }

    saveVoucher(voucher);
    refreshVouchers();
    setStatus('Transaction saved');
    return true;
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

  const handleVoiceCommandRecognized = (data) => {
    console.log("Voice command recognized", data);
    if (data.type) {
      setVoucherType(data.type);
    }
    if (data.amount > 0) {
      setVoucherAmount(data.amount);
    }
    if (data.isBank !== undefined) {
      const bankLedger = ledgers.find(l => l.group === 'Bank Accounts');
      if (data.isBank && bankLedger) {
        setVoucherCashId(bankLedger.id);
      } else {
        setVoucherCashId(CASH_LEDGER_ID);
      }
    }
    if (data.originalText) {
      setVoucherNarration(data.originalText);
    }
    
    if (data.partyLedgerId && (data.type === 'Sales' || data.type === 'Purchase')) {
      if (data.type === 'Sales') {
        setUseSalesInsteadOfParty(false);
      } else {
        setUseExpenseInsteadOfSupplier(false);
      }
      setVoucherPartyId(data.partyLedgerId);
    }
  };

  const saveVoucherEntry = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    setVoucherFormError('');
    setVoucherFormSuccess('');

    const amount = normalizeAmount(voucherAmount);
    if (amount <= 0) {
      setVoucherFormError('Please enter a voucher amount greater than 0.');
      setStatus('Enter a voucher amount greater than zero');
      return;
    }

    let selectedLedgerId = '';
    let accountDisplayName = '';
    let lines = [];

    if (voucherType === 'Sales') {
      // Credit sale to customer: Dr Customer, Cr Sales
      let custId = voucherPartyId;
      if (!custId && customerParties.length > 0) {
        custId = customerParties[0].id;
      }
      if (!custId) {
        try {
          const { ledgers: nextL, ledger: newL } = addPartyLedger('Walk-in Customer', 'customer');
          setLedgers(nextL);
          custId = newL.id;
        } catch {}
      }
      selectedLedgerId = custId || 'ledger-customer-default';
      const custObj = ledgers.find((l) => l.id === selectedLedgerId) || customerParties.find((c) => c.id === selectedLedgerId);
      accountDisplayName = custObj?.name || 'Customer';
      lines = buildCreditSaleLines(amount, selectedLedgerId, SALES_LEDGER_ID);
    } else if (voucherType === 'Purchase') {
      // Credit purchase from supplier: Dr Material/Purchase, Cr Supplier
      let supId = voucherPartyId;
      if (!supId && supplierParties.length > 0) {
        supId = supplierParties[0].id;
      }
      if (!supId) {
        try {
          const { ledgers: nextL, ledger: newL } = addPartyLedger('General Supplier', 'supplier');
          setLedgers(nextL);
          supId = newL.id;
        } catch {}
      }
      selectedLedgerId = supId || 'ledger-supplier-default';
      const supObj = ledgers.find((l) => l.id === selectedLedgerId) || supplierParties.find((s) => s.id === selectedLedgerId);
      accountDisplayName = supObj?.name || 'Supplier';
      const purchaseLedgerId = voucherExpenseId || MATERIAL_LEDGER_ID;
      lines = buildCreditPurchaseLines(amount, purchaseLedgerId, selectedLedgerId);
    } else if (voucherType === 'Receipt') {
      // Cash / Bank receipt: Dr Cash/Bank, Cr Income/Party
      const cashId = voucherCashId || CASH_LEDGER_ID;
      const creditId = useSalesInsteadOfParty ? SALES_LEDGER_ID : (voucherPartyId || SALES_LEDGER_ID);
      selectedLedgerId = creditId;
      const targetObj = ledgers.find((l) => l.id === creditId);
      accountDisplayName = targetObj?.name || (useSalesInsteadOfParty ? 'Sales' : 'Customer');
      lines = buildReceiptLines(amount, cashId, creditId);
    } else if (voucherType === 'Payment') {
      // Cash / Bank payment: Dr Expense/Supplier, Cr Cash/Bank
      const cashId = voucherCashId || CASH_LEDGER_ID;
      const debitId = useExpenseInsteadOfSupplier
        ? (voucherExpenseId || DEFAULT_EXPENSE_LEDGER_ID)
        : (voucherPartyId || DEFAULT_EXPENSE_LEDGER_ID);
      selectedLedgerId = debitId;
      const targetObj = ledgers.find((l) => l.id === debitId);
      accountDisplayName = targetObj?.name || (useExpenseInsteadOfSupplier ? 'Expense' : 'Supplier');
      lines = buildPaymentLines(amount, debitId, cashId);
    }

    // Auto-generate narration if empty
    let narration = sanitizeText(voucherNarration, 300);
    if (!narration || !narration.trim()) {
      if (voucherType === 'Sales') narration = `Credit Sale to ${accountDisplayName}`;
      else if (voucherType === 'Purchase') narration = `Credit Purchase from ${accountDisplayName}`;
      else if (voucherType === 'Receipt') narration = `Receipt from ${accountDisplayName}`;
      else if (voucherType === 'Payment') narration = `Payment for ${accountDisplayName}`;
      else narration = `${voucherType} Voucher`;
    }

    const voucherId = editingVoucher?.id || createVoucherId();
    const newVoucherData = {
      id: voucherId,
      transactionId: voucherId,
      transaction_id: voucherId,
      type: voucherType || 'Receipt',
      date: voucherDate || new Date().toISOString().slice(0, 10),
      amount: Number(amount),
      narration: narration.trim(),
      partyId: selectedLedgerId,
      partyName: accountDisplayName,
      party_name: accountDisplayName,
      accountName: accountDisplayName,
      account_name: accountDisplayName,
      source: 'voucher-entry',
      userId: authUser?.uid || 'guest',
      user_id: authUser?.uid || 'guest',
      ownerUid: authUser?.uid || 'guest',
      lines,
      status: 'completed',
      createdAt: editingVoucher?.createdAt || new Date().toISOString(),
      created_at: editingVoucher?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Resilient cloud sync (never crashes local state)
    try {
      if (authUser?.uid && saveAuthenticatedCloudRecord) {
        await saveAuthenticatedCloudRecord('transactions', voucherId, newVoucherData).catch((err) => {
          console.warn('Cloud sync error for voucher:', err);
        });
      }
    } catch (cloudErr) {
      console.warn('Supabase cloud transaction save caught error; proceeding locally:', cloudErr);
    }

    // Local save: update state and localStorage
    const nextVouchers = editingVoucher
      ? vouchers.map((v) => (v.id === editingVoucher.id ? newVoucherData : v))
      : [newVoucherData, ...vouchers.filter((v) => v.id !== voucherId)];

    setVouchers(nextVouchers);
    writeSavedArray(VOUCHERS_KEY, nextVouchers);

    // Reset form
    setVoucherAmount('');
    setVoucherNarration('');
    const wasEditing = editingVoucher;
    setEditingVoucher(null);
    setVoucherFormSuccess(
      `${wasEditing ? 'Updated' : 'Saved'} ${voucherType} voucher for ₹${Number(amount).toLocaleString('en-IN')} successfully!`
    );
    setStatus(`Voucher ${voucherId} saved successfully.`);
  };

  const handleSaveVoiceConfirmation = async (confirmedData) => {
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
      setVoucherPartyId(voucher.partyId || debitLine?.ledgerId || '');
    } else if (voucher.type === 'Purchase') {
      setUseExpenseInsteadOfSupplier(false);
      setVoucherExpenseId(debitLine?.ledgerId || MATERIAL_LEDGER_ID);
      setVoucherPartyId(voucher.partyId || creditLine?.ledgerId || '');
    }
    setVoucherFormError('');
    setVoucherFormSuccess('');
    setActiveTab('voucher-entry');
    window.location.hash = 'voucher-entry';
    setStatus(`Editing ${voucher.type} voucher`);

    const formEl = document.querySelector('#voucher-entry form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const removeVoucher = async (voucherId) => {
    if (!confirm('Are you sure you want to delete this voucher?')) {
      return;
    }

    try {
      if (authUser?.uid && deleteAuthenticatedCloudRecord) {
        await deleteAuthenticatedCloudRecord('transactions', voucherId).catch((err) => {
          console.warn('Cloud delete error for voucher:', err);
        });
      }
    } catch (error) {
      console.warn('Cloud delete error:', error);
    }

    deleteVoucher(voucherId);
    const nextVouchers = vouchers.filter((voucher) => voucher.id !== voucherId);
    setVouchers(nextVouchers);
    writeSavedArray(VOUCHERS_KEY, nextVouchers);

    if (editingVoucher?.id === voucherId) {
      setEditingVoucher(null);
      setVoucherAmount('');
      setVoucherNarration('');
    }
    setVoucherFormSuccess('Voucher deleted successfully.');
    setStatus('Voucher deleted');
  };

  const saveManualEntry = async (event) => {
    const targetForm = event.currentTarget;
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
    
    if (amount <= 0) {
      setStatus('Please enter a valid amount');
      return;
    }

    const voucherId = `vch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newVoucher = {
      id: voucherId,
      type: manualType,
      date: new Date().toISOString().slice(0, 10),
      amount: amount,
      narration: text,
      lines: [], 
      source: "dashboard",
      userId: authUser?.uid || 'guest',
      ownerUid: authUser?.uid || 'guest',
      transactionId: `txn-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (supabaseEnabled && authUser?.uid) {
      try {
        const saved = await saveCloudRecord(authUser.uid, "transactions", voucherId, newVoucher);
        if (!saved) {
          console.error("Dashboard entry save error");
          setSecureError("Failed to save dashboard entry to cloud");
          return;
        }
      } catch (err) {
        console.error("Dashboard entry catch error", err);
        setSecureError("Exception while saving dashboard entry");
        return;
      }
    }

    // Persist locally for immediate UI update in Day Book / Recent Entries
    saveVoucher(newVoucher);
    
    setTranscript(text);
    setStatus(`Saved ${manualType} of ${formatCurrency(amount)}`);
    setManualText('');
    setManualAmount('');
    trackEvent('Dashboard entry saved');
  };

  const fillManualTemplate = (type, amount, text) => {
    setManualType(type);
    setManualAmount(amount ? String(amount) : '');
    setManualText(text);
  };

  const addParty = async (event) => {
    const targetForm = event.currentTarget;
    event.preventDefault();
    console.log("Party submit started", { newPartyName, newPartyType });

    if (!requireSensitiveAccess('add party')) {
      return;
    }
    
    if (!profile?.name) {
      setStatus('Please select or create a company before adding parties.');
      setSecureError('Please select or create a company before adding parties.');
      return;
    }
    
    if (!newPartyName || !newPartyName.trim()) {
      setStatus('Party name is required.');
      return;
    }

    try {
      const { ledgers: nextLedgers, ledger } = addPartyLedger(newPartyName, newPartyType);
      
      const payload = {
        id: ledger.id,
        name: ledger.name,
        group: newPartyType === 'supplier' ? 'Sundry Creditors' : 'Sundry Debtors',
        type: newPartyType,
        createdAt: new Date().toISOString(),
        business_id: null,
          balance: 0,
          opening_balance: 0
        };
        const collectionName = newPartyType === 'supplier' ? 'suppliers' : 'customers';
      
      console.log(`Party insert payload for ${collectionName}:`, payload);
      
      let savedToCloud = false;
      try {
        if (authUser?.uid) {
          savedToCloud = await saveAuthenticatedCloudRecord(collectionName, ledger.id, payload).catch((err) => {
            console.warn(`Party cloud save warning for ${collectionName}:`, err);
          });
        }
      } catch (cloudErr) {
        console.warn(`Party Supabase error [${collectionName}]:`, cloudErr);
      }
      
      setLedgers(nextLedgers);
      setVoucherPartyId(ledger.id);
      setStatementLedgerId(ledger.id);
      setUseSalesInsteadOfParty(false);
      setNewPartyName('');
      setVoucherFormError('');

      if (newPartyType === 'supplier') {
        setVoucherType('Purchase');
        setUseExpenseInsteadOfSupplier(false);
        setCloudSuppliers((prev) => [payload, ...(Array.isArray(prev) ? prev.filter((s) => s.id !== ledger.id) : [])]);
        try {
          const existing = readSavedArray('erpSuppliers');
          writeSavedArray('erpSuppliers', [payload, ...existing.filter((s) => s.id !== ledger.id)]);
        } catch (e) {}
        setVoucherFormSuccess(`Party "${newPartyName.trim()}" added as Supplier and selected for Purchase Voucher! Enter purchase amount below, or switch to Payment voucher to record cash paid.`);
      } else {
        setVoucherType('Sales');
        setCloudCustomers((prev) => [payload, ...(Array.isArray(prev) ? prev.filter((c) => c.id !== ledger.id) : [])]);
        try {
          const existing = readSavedArray('erpCustomers');
          writeSavedArray('erpCustomers', [payload, ...existing.filter((c) => c.id !== ledger.id)]);
        } catch (e) {}
        setVoucherFormSuccess(`Party "${newPartyName.trim()}" added as Customer and selected for Sales Voucher! Enter amount below.`);
      }
      setStatus(`Party ledger added successfully.`);
    } catch (error) {
      console.error("Party save error:", error);
      setVoucherFormError(error.message || 'Failed to add party');
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
    const targetForm = event.currentTarget;
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
      gstin: sanitizeText(formData.get('profileGstin'), 30) || profile.gstin || '',
      storeName: sanitizeText(formData.get('profileStoreName'), 140) || sanitizeText(formData.get('profileName'), 140) || DEFAULT_PROFILE.name,
      storeTagline: sanitizeText(formData.get('profileStoreTagline'), 160) || sanitizeText(formData.get('profileTagline'), 160) || DEFAULT_PROFILE.storeTagline,
      whatsapp: sanitizeText(formData.get('profileWhatsapp'), 24) || sanitizeText(formData.get('profilePhone'), 24) || DEFAULT_PROFILE.whatsapp,
      fssaiNumber: sanitizeText(formData.get('profileFssai'), 40) || DEFAULT_PROFILE.fssaiNumber,
      hours: sanitizeText(formData.get('profileHours'), 100) || DEFAULT_PROFILE.hours,
      bannerOffer: sanitizeText(formData.get('profileBannerOffer'), 80) || DEFAULT_PROFILE.bannerOffer,
      bannerRegion: sanitizeText(formData.get('profileBannerRegion'), 120) || DEFAULT_PROFILE.bannerRegion,
      upiId: sanitizeText(formData.get('profileUpiId'), 80) || profile.upiId || DEFAULT_PROFILE.upiId,
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

    // 1. Immediately persist locally so store details, banner offer, etc. NEVER revert on refresh
    try {
      writeScopedString(PROFILE_KEY, JSON.stringify(nextProfile));
    } catch {}
    try {
      localStorage.setItem('businessProfile', JSON.stringify(nextProfile));
      window.dispatchEvent(new CustomEvent('trinetr-profile-updated', { detail: nextProfile }));
    } catch {}
    setProfile(nextProfile);

    // 2. Cloud sync if Supabase is connected and user is logged in
    try {
      if (authUser?.uid && supabaseEnabled) {
        await Promise.allSettled([
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
      }
      setSecureError('');
      setStatus('Business and Online Storefront profile saved');
    } catch (error) {
      console.warn('Cloud profile sync warning:', error);
      setStatus('Business profile saved locally');
    }
  };

  const updateBusinessProfile = async (updates) => {
    const nextProfile = { ...profile, ...updates };
    try {
      writeScopedString(PROFILE_KEY, JSON.stringify(nextProfile));
    } catch {}
    try {
      localStorage.setItem('businessProfile', JSON.stringify(nextProfile));
      window.dispatchEvent(new CustomEvent('trinetr-profile-updated', { detail: nextProfile }));
    } catch {}
    setProfile(nextProfile);

    try {
      if (authUser?.uid && supabaseEnabled) {
        await saveUserProfileSettings(authUser.uid, {
          ...nextProfile,
          userId: authUser.uid,
        });
      }
    } catch (e) {
      console.warn('Cloud profile sync warning:', e);
    }
    setStatus('Business profile updated successfully');
    return nextProfile;
  };

  const resetBusinessProfile = () => {
    removeScopedValue(PROFILE_KEY);
    try {
      localStorage.removeItem('businessProfile');
    } catch {}
    setProfile(DEFAULT_PROFILE);
    setStatus('Business profile reset');
  };

  const exportVouchersCsv = () => {
    const rows = voucherToCsvRows(vouchers, ledgers);
    downloadCsv(`day-book-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    setStatus('Day book exported to CSV (open in Excel)');
  };

  const restoreFullBackup = async (event) => {
    const targetForm = event.currentTarget;
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
    const targetForm = event.currentTarget;
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
      businessId: authUser.businessId,
      companyId: authUser.businessId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await saveEmployeeSelfServiceRecord(authUser.uid, 'leave_requests', request.id, request);
      setCloudLeaveRequests((items) => [request, ...items.filter((item) => item.id !== request.id)]);
      setStatus('Leave request submitted');
      if (targetForm) targetForm.reset(); else if (event && event.target && event.target.reset) event.target.reset();;
    } catch (error) {
      setStatus(publicSafeError(error, 'Could not submit leave request.'));
    }
  };

  const downloadSelfHrmsFile = async (path, record = {}) => {
    try {
      const url = await getAuthenticatedHrmsDocumentUrl(path);
      if (!url) throw new Error('Secure download URL was not generated.');
      logEmployeeSelfServiceEvent(authUser.uid, {
        businessId: authUser.businessId,
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

  const STOREFRONT_TABS = ['store', 'storefront', 'shop', 'product-menu', 'categories', 'store-contact'];
  if (STOREFRONT_TABS.includes(activeTab)) {
    return (
      <StorefrontHome
        profile={profile}
        onUpdateProfile={updateBusinessProfile}
        customInventory={cloudInventory}
        isOwner={Boolean(isCompanyOwner && authUser)}
        initialTab={activeTab === 'store-contact' ? 'contact' : activeTab === 'storefront' ? 'store' : activeTab}
        onSwitchToErp={() => {
          setActiveTab('dashboard');
          window.location.hash = 'dashboard';
        }}
        onSwitchToLogin={() => {
          setActiveTab('dashboard');
          setAuthView('login');
          window.location.hash = 'login';
        }}
      />
    );
  }

  if (authView !== 'app') {
    return (
      <main className="saas-public-shell">
        <header className="saas-nav">
          <a className="saas-logo" href="#home" onClick={() => setAuthView('landing')}>
            <img src={profile.logo} alt="" />
            <span>Trinetr Business Suite</span>
          </a>
          <nav>
            <a 
              href="#store" 
              onClick={() => { setActiveTab('store'); window.location.hash = 'store'; }} 
              style={{ color: '#d97706', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              🛍️ Online Store
            </a>
            <a href="#features" onClick={() => { if(authView !== 'landing') setAuthView('landing'); }}>Features</a>
            <button type="button" onClick={() => { trackPageView('pricing-modal'); setShowPricing(true); }}>Pricing</button>
            <button type="button" onClick={() => setAuthView('about-app')}>About</button>
            <button type="button" onClick={() => setShowContactModal(true)}>Contact</button>
            <button type="button" onClick={() => setAuthView('login')}>Login</button>
            <button className="saas-primary-button" type="button" onClick={() => { trackEvent('Signup started'); setAuthView('register'); }}>
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
                  <button className="saas-primary-button" type="button" onClick={() => { trackEvent('Signup started'); setAuthView('register'); }}>
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
                    <button className={index === 1 ? 'saas-primary-button' : 'saas-secondary-button'} type="button" onClick={() => { trackEvent('Signup started'); setAuthView('register'); }}>
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
                <button type="button" onClick={() => setShowContactModal(true)}>Contact</button>
              </nav>
            </footer>
          </>
        ) : (
          <section className="auth-page">
            <div className="auth-card">
              <span className={`security-mode ${supabaseEnabled ? 'live' : 'demo'}`}>
                {supabaseEnabled ? 'Supabase secure mode' : ALLOW_DEMO_AUTH ? 'Local demo mode' : 'Supabase required'}
              </span>

              {/* Customer Direct Storefront Access Card */}
              {authView === 'login' && (
                <div className="auth-customer-direct-box">
                  <div className="auth-customer-direct-header">
                    <span className="auth-customer-tag">🛍️ Customer Direct Access</span>
                    <span className="auth-customer-pill">No Login or GST Required</span>
                  </div>
                  <p className="auth-customer-desc">
                    Looking to buy fresh Gujarati namkeen, wafers & snacks? Customers can directly browse our full store and place orders without any login!
                  </p>
                  <button
                    type="button"
                    className="auth-customer-shop-btn"
                    onClick={() => {
                      setActiveTab('store');
                      window.location.hash = 'store';
                    }}
                  >
                    <span>Directly Access Online Store</span>
                    <span className="btn-arrow">→</span>
                  </button>
                </div>
              )}

              {authView === 'login' && (
                <div className="auth-portal-divider">
                  <span>OR RETAILER BUSINESS PORTAL</span>
                </div>
              )}

              <span className="saas-kicker">
                {authView === 'reset-password'
                  ? 'Account recovery'
                  : authView === 'login'
                    ? 'Retailer Business Portal'
                    : 'Retailer Onboarding'}
              </span>
              <h1>
                {authView === 'reset-password'
                  ? 'Reset your password'
                  : authView === 'login'
                    ? 'Retailer / Business Login'
                    : 'Register Your Business'}
              </h1>
              {authNotice && <div className="notice">{authNotice}</div>}
              {secureError && <div className="notice error">{secureError}</div>}
              {authView === 'login' && (
                <div className="notice auth-help-note">
                  Restricted to registered retailers. Enter your 15-character GSTIN, registered email, and password to manage business operations.
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
                    <label className="field-label" htmlFor="auth-business">Business Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input id="auth-business" name="businessName" placeholder="Your business name" required />
                    <label className="field-label" htmlFor="auth-owner">Owner Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input id="auth-owner" name="ownerName" placeholder="Owner name" required />
                  </>
                )}

                {/* GST Number Fill Box: Restricted to Retailers */}
                <div className="auth-field-group">
                  <div className="password-label-row">
                    <label className="field-label" htmlFor="auth-gstin">
                      Retailer GSTIN Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span className="auth-badge-small">15-Digit GST Required</span>
                  </div>
                  <input
                    id="auth-gstin"
                    name="gstin"
                    type="text"
                    defaultValue={profile?.gstin || ''}
                    placeholder="e.g. 24CPVPC7753J1Z8"
                    maxLength={15}
                    required
                    style={{
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                      letterSpacing: '1.2px',
                      fontWeight: 700
                    }}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <p className="field-help" style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                    Only verified retailers with a valid 15-digit GSTIN can login. Customers can access store above.
                  </p>
                </div>

                <label className="field-label" htmlFor="auth-email">Business Email <span style={{ color: '#ef4444' }}>*</span></label>
                <input id="auth-email" name="email" type="email" placeholder="owner@business.com" autoComplete="username email" inputMode="email" required />
                <div className="password-label-row">
                  <label className="field-label" htmlFor="auth-password">Password <span style={{ color: '#ef4444' }}>*</span></label>
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
                  required
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
                  {authLoading ? 'Please wait...' : authView === 'login' ? 'Login to Retailer Portal' : 'Register Retailer Business'}
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
                <button className="secondary-button full mt-2" type="button" onClick={() => { trackPageView('pricing-modal'); setShowPricing(true); }} disabled={authLoading}>
                  View Pricing
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
        <aside className={`sidebar mobile-drawer ${mobileNavOpen ? 'drawer-open' : ''}`} aria-label="Mobile Navigation Menu" style={{ borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-brand" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
          {profile.logo ? <img src={profile.logo} alt="" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} /> : <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#1e3a8a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px' }}>TR</div>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '13px', fontWeight: '700', lineHeight: '1.2' }}>{profile.name || 'JAY AMBE NAMKEEN'}</strong>
            <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 700, letterSpacing: '0.05em' }}>TRINETR ERP [2026-2027]</span>
          </div>
          <button className="drawer-close-button" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
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
            children: section.children.filter((child) => (!child.debugOnly || canViewDatabaseDebug) && !child.hidden),
          })).filter((section) => section.children.length > 0).map((section) => {
            const isExpanded = openSidebarSections[section.id] ?? true;
            const hasActiveItem = section.children.some((child) => child.tab === activeTab);

            return (
              <div key={section.id} style={{ marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => toggleSidebarSection(section.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', fontSize: '13px', fontWeight: '750', textTransform: 'uppercase', letterSpacing: '0.05em' }}
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
                          background: activeTab === child.tab ? '#eff6ff' : 'transparent',
                          color: activeTab === child.tab ? '#1d4ed8' : '#0f172a',
                          fontWeight: activeTab === child.tab ? '700' : '550',
                          border: activeTab === child.tab ? '1px solid #bfdbfe' : '1px solid transparent',
                          boxShadow: activeTab === child.tab ? 'var(--shadow-sm)' : 'none'
                        }}
                      >
                        <span style={{ opacity: activeTab === child.tab ? 1 : 0.85, fontSize: '16px' }}>{child.icon || '•'}</span>
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
        {false && (
          <SetupWizard 
            profile={profile}
            onComplete={(didAddDemoData) => {
              const updatedProfile = {...profile, setupCompleted: true, onboardingCompleted: true, workspaceSetupCompleted: true};
              setProfile(updatedProfile);
              if (authUser?.uid) {
                saveAuthenticatedCloudRecord('settings', 'profile', updatedProfile);
                try {
                  localStorage.setItem('TRINETR_PROFILE', JSON.stringify(updatedProfile));
                } catch (e) {}
              }
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
                  setSecureError(e?.message || 'Failed to save setup to cloud');
                }
              }
            }}
          />
        )}
        {showTour && <GuidedTour onFinish={() => setShowTour(false)} />}
        
        {/* PROFIT NX ERP TOP NUMBERED MENUBAR (Matching FR.mp4) */}
        <div className="profitnx-erp-top-wrapper" style={{ position: 'relative', zIndex: 110 }}>
          {/* Trinetr Numbered Menu Bar */}
          <nav className="profitnx-menubar hide-on-mobile" style={{
            background: '#0f172a',
            color: '#f1f5f9',
            padding: '2px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            borderBottom: '2px solid #2563eb',
            fontSize: '13px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
              {/* 1. Transaction */}
              <div className="profitnx-menu-item" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setOpenNxMenu(openNxMenu === 'trans' ? null : 'trans')}
                  style={{
                    background: openNxMenu === 'trans' ? '#1e293b' : 'transparent',
                    color: '#ffffff',
                    border: 'none',
                    padding: '9px 14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  1. Transaction ▾
                </button>
              {openNxMenu === 'trans' && (
                <div className="trinetr-dropdown-menu">
                  <button type="button" className="trinetr-dropdown-item featured" onClick={() => { navigateToTab('sales-entry'); setOpenNxMenu(null); }}>
                    ⚡ Sales Entry &amp; Quick Bill (F2)
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('invoices'); setOpenNxMenu(null); }}>
                    📋 Tax Invoices Register
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('voucher-entry'); setOpenNxMenu(null); }}>
                    ▣ Voucher Entry (Purchase, Expense, Cash &amp; Bank)
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('day-book'); setOpenNxMenu(null); }}>
                    ☷ Daily Day Book &amp; Passbook
                  </button>
                  <div className="trinetr-dropdown-divider" />
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('upi-payments'); setOpenNxMenu(null); }}>
                    💳 Payments &amp; UPI Receipts
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('inventory'); setOpenNxMenu(null); }}>
                    ⬢ Stock &amp; Inventory Management (Inward, Raw Material &amp; Transfers)
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('orders'); setOpenNxMenu(null); }}>
                    🛒 Storefront Customer Orders
                  </button>
                </div>
              )}
            </div>

            {/* 2. Reports */}
            <div className="profitnx-menu-item" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenNxMenu(openNxMenu === 'reports' ? null : 'reports')}
                style={{
                  background: openNxMenu === 'reports' ? '#1e293b' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                2. Reports ▾
              </button>
              {openNxMenu === 'reports' && (
                <div className="trinetr-dropdown-menu">
                  <button type="button" className="trinetr-dropdown-item featured" onClick={() => { navigateToTab('sales-entry'); setOpenNxMenu(null); }}>
                    ⚡ Sales Register &amp; Item Wise Analysis
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('day-book'); setOpenNxMenu(null); }}>
                    ☷ Day Book Summary &amp; Vouchers
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('party-statement'); setOpenNxMenu(null); }}>
                    ▤ Customer / Supplier Khata Statement
                  </button>
                  <div className="trinetr-dropdown-divider" />
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('gst'); setOpenNxMenu(null); }}>
                    ◇ GST Returns (GSTR-1, GSTR-3B)
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('accounting-ledgers'); setOpenNxMenu(null); }}>
                    ▦ Accounting Ledgers &amp; Trial Balance
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('reports'); setOpenNxMenu(null); }}>
                    📊 Profit &amp; Loss / Balance Sheet
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('crm'); setOpenNxMenu(null); }}>
                    ▱ Outstanding Receivables &amp; Payables
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('reports-hub'); setOpenNxMenu(null); }}>
                    ⌁ Advanced Analytics Reports Hub
                  </button>
                </div>
              )}
            </div>

            {/* 3. Analytics */}
            <div className="profitnx-menu-item" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenNxMenu(openNxMenu === 'analytics' ? null : 'analytics')}
                style={{
                  background: openNxMenu === 'analytics' ? '#1e293b' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                3. Analytics ▾
              </button>
              {openNxMenu === 'analytics' && (
                <div className="trinetr-dropdown-menu">
                  <button type="button" className="trinetr-dropdown-item featured" onClick={() => { navigateToTab('analytics'); setOpenNxMenu(null); }}>
                    ⌁ Business Analytics, Revenue Trends &amp; Product Performance
                  </button>
                  <div className="trinetr-dropdown-divider" />
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('ai-assistant'); setOpenNxMenu(null); }}>
                    ✣ AI Business Assistant &amp; Forecasts
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('voice-bookkeeper'); setOpenNxMenu(null); }}>
                    🎙️ Voice Command Center &amp; History
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('crm'); setOpenNxMenu(null); }}>
                    👥 Customer Growth &amp; Lifetime Value (LTV)
                  </button>
                </div>
              )}
            </div>

            {/* 4. Process */}
            <div className="profitnx-menu-item" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenNxMenu(openNxMenu === 'process' ? null : 'process')}
                style={{
                  background: openNxMenu === 'process' ? '#1e293b' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                4. Process ▾
              </button>
              {openNxMenu === 'process' && (
                <div className="trinetr-dropdown-menu">
                  <button type="button" className="trinetr-dropdown-item featured" onClick={() => { navigateToTab('masters'); setOpenNxMenu(null); }}>
                    ◈ Masters Central Console
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('company-setup'); setOpenNxMenu(null); }}>
                    ▦ Company Setup &amp; Financial Year
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('businesses'); setOpenNxMenu(null); }}>
                    ⌖ Multi-Business / Branches
                  </button>
                  <div className="trinetr-dropdown-divider" />
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('cloud-backup'); setOpenNxMenu(null); }}>
                    ⎇ Cloud Backup, Sync &amp; Restore
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('security-center'); setOpenNxMenu(null); }}>
                    ◇ Security Center &amp; Audit Logs
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('user-management'); setOpenNxMenu(null); }}>
                    ♙ Users, Roles &amp; Permissions
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('accountant-portal'); setOpenNxMenu(null); }}>
                    ☷ CA / Accountant Access Portal
                  </button>
                </div>
              )}
            </div>

            {/* 5. Production */}
            <div className="profitnx-menu-item" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenNxMenu(openNxMenu === 'production' ? null : 'production')}
                style={{
                  background: openNxMenu === 'production' ? '#1e293b' : 'transparent',
                  color: '#4ade80',
                  border: 'none',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 750,
                  cursor: 'pointer'
                }}
              >
                5. Production ▾
              </button>
              {openNxMenu === 'production' && (
                <div className="trinetr-dropdown-menu">
                  <button type="button" className="trinetr-dropdown-item featured" onClick={() => { navigateToTab('production'); setOpenNxMenu(null); }}>
                    ⚙ Batch Production Run &amp; Recipe BOM Master
                  </button>
                  <div className="trinetr-dropdown-divider" />
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('inventory'); setOpenNxMenu(null); }}>
                    ⬢ Production Inventory (Raw Materials &amp; Finished Goods Stock)
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('production'); setOpenNxMenu(null); }}>
                    ⚡ Output Yield, Wastage &amp; Batch Production History
                  </button>
                </div>
              )}
            </div>

            {/* 6. Payroll */}
            <div className="profitnx-menu-item" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenNxMenu(openNxMenu === 'payroll' ? null : 'payroll')}
                style={{
                  background: openNxMenu === 'payroll' ? '#1e293b' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                6. Payroll ▾
              </button>
              {openNxMenu === 'payroll' && (
                <div className="trinetr-dropdown-menu">
                  <button type="button" className="trinetr-dropdown-item featured" onClick={() => { navigateToTab('employees'); setOpenNxMenu(null); }}>
                    👥 Employee Directory &amp; Staff Profiles
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('employees'); setOpenNxMenu(null); }}>
                    📅 Daily Attendance &amp; Shift Register
                  </button>
                  <div className="trinetr-dropdown-divider" />
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('employees'); setOpenNxMenu(null); }}>
                    💵 Monthly Payroll, Payslips, Leaves &amp; KYC Documents
                  </button>
                </div>
              )}
            </div>

            {/* 7. Master */}
            <div className="profitnx-menu-item" style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenNxMenu(openNxMenu === 'master' ? null : 'master')}
                style={{
                  background: openNxMenu === 'master' ? '#1e293b' : 'transparent',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                7. Master ▾
              </button>
              {openNxMenu === 'master' && (
                <div className="trinetr-dropdown-menu">
                  <button type="button" className="trinetr-dropdown-item featured" onClick={() => { navigateToTab('crm'); setOpenNxMenu(null); }}>
                    ☉ Party / Customer Master (Sundry Debtors)
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('suppliers'); setOpenNxMenu(null); }}>
                    ◎ Supplier Master (Sundry Creditors)
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('inventory'); setOpenNxMenu(null); }}>
                    ⬢ Item &amp; Product Master (Inventory, Price Lists &amp; Units)
                  </button>
                  <div className="trinetr-dropdown-divider" />
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('whatsapp-automation'); setOpenNxMenu(null); }}>
                    ⚡ WhatsApp Messaging Automation
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('app-settings'); setOpenNxMenu(null); }}>
                    ⚙ Company Profile &amp; GST Settings
                  </button>
                  <button type="button" className="trinetr-dropdown-item" onClick={() => { navigateToTab('billing'); setOpenNxMenu(null); }}>
                    💳 Subscription Plan &amp; Billing Center
                  </button>
                </div>
              )}
            </div>

            {/* TRINETR Dashboard */}
            <div className="profitnx-menu-item">
              <button
                type="button"
                onClick={() => { navigateToTab('dashboard'); setOpenNxMenu(null); }}
                style={{
                  background: activeTab === 'dashboard' ? '#1e293b' : 'transparent',
                  color: '#93c5fd',
                  border: 'none',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 750,
                  cursor: 'pointer'
                }}
              >
                TRINETR Dashboard
              </button>
            </div>
            </div>

            {/* Global Search in Top Section */}
            <div className="profitnx-search-container" style={{ width: '280px', maxWidth: '30vw', flexShrink: 0, padding: '3px 0' }}>
              <GlobalSearch onNavigate={(route) => {
                setActiveTab(route);
                window.location.hash = route;
              }} theme="dark" />
            </div>
          </nav>
        </div>

        <header className="topbar" style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'nowrap', overflowX: 'auto' }}>
          {authUser?.mode === 'demo' && (
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: 'var(--brand-primary)', color: 'white', padding: '4px 16px', fontSize: '12px', fontWeight: 600, borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', zIndex: 100 }}>
              Demo Mode
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'nowrap' }}>
            <button
              className="topbar-menu-button"
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
              style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#0f172a' }}
            >
              ☰
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
              <span style={{ background: '#1e3a8a', color: '#ffffff', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>TRINETR ERP</span>
              <strong style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{profile.name || 'JAY AMBE NAMKEEN'}</strong>
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>[2026 - 2027]</span>
              <span className="hide-on-mobile" style={{ color: '#cbd5e1' }}>|</span>
              <span className="hide-on-mobile" style={{ fontSize: '12px', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap' }}>
                GSTIN: <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '12.5px', fontWeight: 750 }}>{profile.gstin || '24CPVPC7753J1Z8'}</strong>
              </span>
            </div>
          </div>
          <div className="erp-top-actions-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap', flexShrink: 0 }}>
            {/* 1. Sales Register (F2) Quick Access */}
            <button
              type="button"
              className="btn btn-secondary hover-scale"
              onClick={() => { setActiveTab('sales-entry'); window.location.hash = 'sales-entry'; }}
              title="Open Sales Register & Quick Bill (Shortcut F2)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                background: activeTab === 'sales-entry' ? '#1e3a8a' : '#eff6ff',
                color: activeTab === 'sales-entry' ? '#ffffff' : '#1e3a8a',
                border: '1px solid #bfdbfe',
                fontWeight: '750',
                padding: '7px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                width: 'auto',
                flex: '0 0 auto'
              }}
            >
              <FileText size={15} />
              <span>1. Sales Register (F2)</span>
            </button>

            {/* 5. Production Quick Access */}
            <button
              type="button"
              className="btn btn-secondary hover-scale"
              onClick={() => { setActiveTab('production'); window.location.hash = 'production'; }}
              title="Open Production Run Entry & Recipes BOM"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                background: activeTab === 'production' ? '#059669' : '#ecfdf5',
                color: activeTab === 'production' ? '#ffffff' : '#047857',
                border: '1px solid #a7f3d0',
                fontWeight: '750',
                padding: '7px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                width: 'auto',
                flex: '0 0 auto'
              }}
            >
              <Package size={15} />
              <span>5. Production</span>
            </button>

            {/* Online Storefront Switcher */}
            <button
              type="button"
              className="btn btn-secondary hover-scale"
              onClick={() => { setActiveTab('store'); window.location.hash = 'store'; }}
              title={`View Customer Online Storefront (${profile.storeName || profile.name || 'Store'})`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                background: activeTab === 'store' ? '#92400e' : '#fef3c7',
                color: activeTab === 'store' ? '#ffffff' : '#92400e',
                border: '1px solid #fde68a',
                fontWeight: '750',
                padding: '7px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                width: 'auto',
                flex: '0 0 auto'
              }}
            >
              <ShoppingBag size={15} />
              <span>Online Storefront</span>
            </button>
            
            {/* Quick Add Dropdown */}
            <div className="saas-dropdown-container" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '13px', whiteSpace: 'nowrap', width: 'auto', flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                onClick={() => {
                  setQuickAddOpen(!quickAddOpen);
                  setProfileDropdownOpen(false);
                }}
              >
                <Plus size={16} /> Quick Add <ChevronDown size={14} style={{ opacity: 0.7 }} />
              </button>
              <div className={`saas-dropdown-menu ${quickAddOpen ? 'dropdown-active' : ''}`} style={quickAddOpen ? { opacity: 1, visibility: 'visible', transform: 'translateY(0)' } : undefined}>
                <button type="button" onClick={() => navigateToTab('sales-entry')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', fontWeight: 600, color: '#1e3a8a' }}><FileText size={16} /> ⚡ Sales Entry (F2)</button>
                <button type="button" onClick={() => navigateToTab('production')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', fontWeight: 600, color: '#059669' }}><Package size={16} /> ⚙ Production Batch</button>
                <button type="button" onClick={() => navigateToTab('invoices')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><FileText size={16} /> New Invoice</button>
                <button type="button" onClick={() => navigateToTab('orders')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><Package size={16} /> New Order</button>
                <button type="button" onClick={() => navigateToTab('crm')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><Users size={16} /> New Customer</button>
                <button type="button" onClick={() => navigateToTab('inventory')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><Package size={16} /> New Product</button>
                <button type="button" onClick={() => navigateToTab('employees')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><User size={16} /> New Employee</button>
                <div className="saas-dropdown-divider"></div>
                <button type="button" onClick={() => navigateToTab('voucher-entry')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><DollarSign size={16} /> Record Expense</button>
              </div>
            </div>

            <a href="#notifications" onClick={() => navigateToTab('notifications')} className="hover-scale" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textDecoration: 'none', background: 'var(--bg-secondary)', flexShrink: 0 }}>
              <Bell size={18} />
            </a>

            {/* Profile Dropdown */}
            <div className="saas-dropdown-container" style={{ flexShrink: 0 }}>
              <div
                className="hover-scale"
                style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px', cursor: 'pointer', border: '2px solid transparent', outline: 'none' }}
                tabIndex="0"
                onClick={() => {
                  setProfileDropdownOpen(!profileDropdownOpen);
                  setQuickAddOpen(false);
                }}
              >
                {(profile.owner || authUser?.email || 'A')[0].toUpperCase()}
              </div>
              <div className={`saas-dropdown-menu ${profileDropdownOpen ? 'dropdown-active' : ''}`} style={profileDropdownOpen ? { opacity: 1, visibility: 'visible', transform: 'translateY(0)' } : undefined}>
                <button type="button" onClick={() => navigateToTab('profile')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><User size={16} /> My Profile</button>
                <button type="button" onClick={() => navigateToTab('app-settings')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><Settings size={16} /> Company Settings</button>
                <button type="button" onClick={() => navigateToTab('billing')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><CreditCard size={16} /> Billing & Plans</button>
                <button type="button" onClick={() => navigateToTab('analytics')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><Activity size={16} /> Analytics</button>
                <button type="button" onClick={() => navigateToTab('preferences')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><CheckSquare size={16} /> Preferences</button>
                <button type="button" onClick={() => navigateToTab('help')} className="saas-dropdown-item" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><HelpCircle size={16} /> Help Center</button>
                <div className="saas-dropdown-divider"></div>
                <button type="button" onClick={() => { setProfileDropdownOpen(false); logout(); }} className="saas-dropdown-item danger" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left' }}><LogOut size={16} /> Logout</button>
              </div>
            </div>

          </div>
        </header>

        <main className="page-shell">
          {cloudBusinesses.length === 0 && !['profile-settings', 'company-setup'].includes(activeTab) && (
              <div style={{ gridColumn: '1 / -1', marginBottom: '16px' }}>
              {userPreferences.showWelcomeMessage && (
                <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Welcome to Trinetr Business Suite</h2>
              )}
              </div>
            )}
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
          
          {activeTab === 'dashboard' && isMobile && (
            <section className="mobile-dashboard-view fade-in" id="mobile-dashboard" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>Business Summary</h1>
              </div>
              
              <div className="dashboard-summary-grid">
                <div className="stat-card-modern" style={{ background: 'var(--bg-primary)' }}>
                  <span className="metric-label">Monthly Revenue</span>
                  <strong className="metric-value">{formatCurrency(stats?.monthlySales || 0)}</strong>
                </div>
                <div className="stat-card-modern" style={{ background: 'var(--bg-primary)' }}>
                  <span className="metric-label">Total Expenses</span>
                  <strong className="metric-value">{formatCurrency(stats?.monthlyExpenses || 0)}</strong>
                </div>
                <div className="stat-card-modern" style={{ background: 'var(--bg-primary)' }}>
                  <span className="metric-label">Net Profit</span>
                  <strong className="metric-value">{formatCurrency(monthlyNetProfit || 0)}</strong>
                </div>
                <div className="stat-card-modern" style={{ background: 'var(--bg-primary)' }}>
                  <span className="metric-label">Pending Payments</span>
                  <strong className="metric-value">{formatCurrency(receivableTotal || 0)}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                <button className="btn btn-primary" onClick={() => { setVoucherType('Receipt'); navigateToTab('voucher-entry'); }} style={{ minHeight: '48px' }}>
                  <Plus size={16} /> Add Income
                </button>
                <button className="btn btn-danger" onClick={() => { setVoucherType('Payment'); navigateToTab('voucher-entry'); }} style={{ minHeight: '48px', background: 'var(--danger)', color: '#fff', border: 'none' }}>
                  <Minus size={16} /> Add Expense
                </button>
              </div>
            </section>
          )}
          
          {activeTab === 'dashboard' && !isMobile && (
            <section className="erp-dashboard fade-in" id="dashboard" style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {userPreferences.enableVoiceShortcut && (
                <VoiceCommandButton 
                  onCommandRecognized={(data) => {
                    handleVoiceCommandRecognized(data);
                    navigateToTab('voucher-entry');
                  }} 
                  existingParties={partyLedgers}
                  isIconOnly={true}
                  className="floating-mic-btn"
                  containerClassName="floating-mic-container"
                />
              )}

              {/* Dashboard Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    Dashboard <span className="badge badge-success" style={{ fontSize: '12px', padding: '4px 10px' }}>Active</span>
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '15px' }}>
                    Welcome back, {profile.owner || 'Admin'}. Here is your executive summary.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <VoiceCommandButton 
                    onCommandRecognized={(data) => {
                      handleVoiceCommandRecognized(data);
                      navigateToTab('voucher-entry');
                    }} 
                    existingParties={partyLedgers}
                    containerClassName="desktop-mic-container"
                  />
                  <button className="btn btn-secondary hover-scale hide-on-mobile" onClick={() => navigateToTab('reports')}>
                    <FileText size={16} /> Reports
                  </button>
                  <button className="btn btn-primary hover-scale hide-on-mobile" onClick={() => navigateToTab('voucher-entry')}>
                    <Plus size={16} /> New Entry
                  </button>
                </div>
              </div>

              {/* Mobile Only Action Row */}
              <div className="mobile-dashboard-actions hide-on-desktop">
                <button type="button" className="btn btn-secondary" aria-label="Reports" title="Reports" onClick={() => navigateToTab('reports')}>
                  <FileText size={20} />
                </button>
                <button type="button" className="btn btn-primary" aria-label="New Entry" title="New Entry" onClick={() => navigateToTab('voucher-entry')}>
                  <Plus size={20} />
                </button>
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
                          { label: 'New Order', desc: 'Add order', icon: Package, path: 'orders', color: '#10b981', bg: '#ecfdf5' },
                          { label: 'Record Expense', desc: 'Add bill', icon: CreditCard, path: 'voucher-entry', color: '#ef4444', bg: '#fef2f2' },
                          { label: 'Receive Payment', desc: 'Cash in', icon: DollarSign, path: 'voucher-entry', color: '#10b981', bg: '#ecfdf5' },
                          { label: 'New Customer', desc: 'Add client', icon: Users, path: 'crm', color: '#f59e0b', bg: '#fffbeb' },
                          { label: 'Payroll', desc: 'Pay staff', icon: Briefcase, path: 'employees', color: '#06b6d4', bg: '#ecfeff' }
                        ].map(action => (
                          <button key={action.label} onClick={() => { 
                            navigateToTab(action.path);
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
                              <button type="button" className="btn btn-secondary hover-scale" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => navigateToTab('inventory')}>Restock</button>
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
                    {userPreferences.showAgendaCard && (
                      <article className="glass-card" style={{ padding: '24px', margin: 0 }}>
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
                      </article>
                    )}

                    {/* SECTION 10: WEATHER & NOTES */}
                    {userPreferences.showWeatherCard && (
                      <article className="glass-card" style={{ padding: '24px', margin: 0, background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', color: 'white', border: 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '13px', opacity: 0.9 }}>Mumbai, India</div>
                            <div style={{ fontSize: '28px', fontWeight: '700' }}>32°C</div>
                            <div style={{ fontSize: '13px', opacity: 0.9 }}>Partly Cloudy</div>
                          </div>
                          <Cloud size={48} opacity={0.9} />
                        </div>
                      </article>
                    )}

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
            'party-management',
            'parties',
            'suppliers',
            'businesses',
            'cloud-backup',
            'notifications',
            'analytics',
          ].includes(activeTab) && (
            <Suspense fallback={<div className="panel skeleton-panel">Loading ERP module...</div>}>
              <Phase2ERP onLimitReached={setUpgradeModalFeature}
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
                onInvoicesChange={(nextInvoices) => setCloudInvoices(nextInvoices)}
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
              <Phase3Ops onLimitReached={setUpgradeModalFeature}
                onVoiceCommandRecognized={(data) => {
                  handleVoiceCommandRecognized(data);
                  setActiveTab('voucher-entry');
                  window.location.hash = 'voucher-entry';
                }}
                activeTab={activeTab}
                profile={profile}
                invoices={cloudInvoices}
                customers={cloudCustomers}
                products={cloudInventory}
                vouchers={vouchers}
                partySummary={partySummary}
                partyLedgers={partyLedgers}
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
                onUpdateInvoice={async (updatedInv) => {
                  setCloudInvoices((prev) => [updatedInv, ...(Array.isArray(prev) ? prev.filter((i) => i.id !== updatedInv.id) : [])]);
                  if (supabaseEnabled && saveAuthenticatedCloudRecord) {
                    try {
                      await saveAuthenticatedCloudRecord('invoices', updatedInv.id, updatedInv);
                    } catch (e) {
                      console.warn('Could not sync updated invoice to cloud:', e);
                    }
                  }
                }}
                onAddVoucher={async (newVch) => {
                  try {
                    await persistVoucher(newVch);
                  } catch (e) {
                    saveVoucher(newVch);
                    refreshVouchers();
                  }
                }}
                onUpdateProfile={updateBusinessProfile}
              />
            </Suspense>
          )}

          {activeTab === 'sales-entry' && (
            <Suspense fallback={<div className="panel skeleton-panel">Loading Sales Register & Entry...</div>}>
              <ProfitNxSalesEntry
                invoices={cloudInvoices}
                orders={cloudOrders}
                inventory={cloudInventory}
                customers={cloudCustomers}
                profile={profile}
                onUpdateProfile={updateBusinessProfile}
                onSaveInvoice={async (newInv) => {
                  setCloudInvoices((prev) => [newInv, ...(Array.isArray(prev) ? prev.filter(i => i.id !== newInv.id) : [])]);
                  if (supabaseEnabled && saveAuthenticatedCloudRecord) {
                    try {
                      await saveAuthenticatedCloudRecord('invoices', newInv.id, newInv);
                    } catch (e) {
                      console.warn('Could not sync invoice to cloud:', e);
                    }
                  }
                  setStatus(`Sales invoice ${newInv.invoiceNo || 'Sale'} saved successfully.`);
                }}
                onDeleteInvoice={async (invId) => {
                  setCloudInvoices((prev) => (Array.isArray(prev) ? prev.filter(i => i.id !== invId) : []));
                  if (supabaseEnabled && deleteAuthenticatedCloudRecord) {
                    try {
                      await deleteAuthenticatedCloudRecord('invoices', invId);
                    } catch (e) {
                      console.warn('Could not delete invoice from cloud:', e);
                    }
                  }
                  setStatus('Sales invoice deleted.');
                }}
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  window.location.hash = tab;
                }}
                onStatus={setStatus}
              />
            </Suspense>
          )}

          {activeTab === 'production' && (
            <Suspense fallback={<div className="panel skeleton-panel">Loading Production Module...</div>}>
              <ProfitNxProduction
                inventory={cloudInventory}
                profile={profile}
                onSaveProductionBatch={(batch) => {
                  setStatus(`Production batch ${batch.batchNo} recorded.`);
                }}
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  window.location.hash = tab;
                }}
                onStatus={setStatus}
              />
            </Suspense>
          )}

          {activeTab === 'more' && isMobile && (
            <section className="mobile-more-view fade-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>More Options</h1>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 <button className="btn btn-secondary" onClick={() => window.location.hash = 'orders'} style={{ justifyContent: 'flex-start', minHeight: '48px', paddingLeft: '16px' }}>📦 Orders</button>
                 <button className="btn btn-secondary" onClick={() => window.location.hash = 'employees'} style={{ justifyContent: 'flex-start', minHeight: '48px', paddingLeft: '16px' }}>👥 Employees</button>
                 <button className="btn btn-secondary" onClick={() => window.location.hash = 'reports'} style={{ justifyContent: 'flex-start', minHeight: '48px', paddingLeft: '16px' }}>📊 Basic Reports</button>
                 <button className="btn btn-secondary" onClick={() => window.location.hash = 'app-settings'} style={{ justifyContent: 'flex-start', minHeight: '48px', paddingLeft: '16px' }}>⚙️ Settings</button>
              </div>

              <div>
                <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>Advanced Features</h3>
                <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                  Features such as <strong>Full Analytics, Advanced CRM, HRMS Document Management, Tax & GST filings, and Audit Logs</strong> are best managed on a larger screen. Please access the desktop/web view to utilize the full Trinetr Business Suite.
                </div>
              </div>

              <button className="btn btn-danger" onClick={logout} style={{ minHeight: '48px' }}>Sign Out</button>
            </section>
          )}

          {activeTab === 'voucher-entry' && (
            <section className="content-grid fade-in" id="voucher-entry">
              <article className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2>{editingVoucher ? 'Edit Voucher' : 'Voucher Entry'}</h2>
                  <div style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    {profile?.name ? (
                      <span className="text-secondary">Active company: <strong>{profile.name}</strong></span>
                    ) : (
                      <>
                        <span className="text-secondary" style={{ color: 'var(--text-error)', marginRight: '8px' }}>No company selected</span>
                        <button type="button" className="secondary-button compact-button" onClick={() => { setActiveTab('company-setup'); window.location.hash = 'company-setup'; }}>Go to Company Setup</button>
                      </>
                    )}
                  </div>
                </div>
                <p className="panel-hint">
                  Receipt / Payment = cash. Sales / Purchase = credit (party khata). Every voucher balances debit and credit.
                </p>
                <VoiceCommandButton onCommandRecognized={handleVoiceCommandRecognized} existingParties={partyLedgers} />
                {voucherFormError && (
                  <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '6px', margin: '14px 0', fontSize: '13px', fontWeight: 600 }}>
                    ⚠️ {voucherFormError}
                  </div>
                )}
                {voucherFormSuccess && (
                  <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '6px', margin: '14px 0', fontSize: '13px', fontWeight: 600 }}>
                    ✅ {voucherFormSuccess}
                  </div>
                )}
                <form onSubmit={saveVoucherEntry}>
                  {/* One-Click Voucher Type Pills */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '18px' }}>
                    {[
                      { type: 'Sales', label: '🛒 Sales', sub: 'Customer (credit)', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                      { type: 'Purchase', label: '📦 Purchase', sub: 'Supplier (credit)', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                      { type: 'Receipt', label: '💰 Receipt', sub: 'Cash / Bank In', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                      { type: 'Payment', label: '💳 Payment', sub: 'To Supplier / Exp', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                    ].map((item) => {
                      const isSelected = voucherType === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            setVoucherType(item.type);
                            if (item.type === 'Purchase' && (!voucherExpenseId || voucherExpenseId === DEFAULT_EXPENSE_LEDGER_ID)) {
                              setVoucherExpenseId(MATERIAL_LEDGER_ID);
                            }
                            setVoucherFormError('');
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected ? `2px solid ${item.color}` : '1px solid var(--border-subtle, #e2e8f0)',
                            background: isSelected ? item.bg : '#ffffff',
                            color: isSelected ? item.color : 'var(--text-primary, #334155)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            minHeight: 'unset',
                            margin: 0,
                            boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ fontWeight: '700', fontSize: '13px' }}>{item.label}</div>
                          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{item.sub}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="form-grid">
                    <div>
                      <label className="field-label" htmlFor="voucher-type">
                        Voucher Type
                      </label>
                      <select
                        id="voucher-type"
                        className="saas-input"
                        style={{ backgroundColor: '#fff', color: '#111827', zIndex: 10, minHeight: '44px', width: '100%', appearance: 'auto', borderRadius: '6px', border: '1px solid #d1d5db', padding: '8px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                        value={voucherType}
                        onChange={(event) => {
                          const val = event.target.value;
                          setVoucherType(val);
                          if (val === 'Purchase' && (!voucherExpenseId || voucherExpenseId === DEFAULT_EXPENSE_LEDGER_ID)) {
                            setVoucherExpenseId(MATERIAL_LEDGER_ID);
                          }
                        }}
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
                            className="saas-input"
                            style={{ backgroundColor: '#fff', color: '#111827', zIndex: 10, minHeight: '44px', width: '100%', appearance: 'auto' }}
                            value={voucherCashId || 'ledger-cash'}
                            onChange={(event) => setVoucherCashId(event.target.value)}
                          >
                            {cashLedgers.length > 0 ? cashLedgers.map((ledger) => (
                              <option key={ledger.id} value={ledger.id}>
                                {ledger.name}
                              </option>
                            )) : (
                              <>
                                <option value="ledger-cash">Cash</option>
                                <option value="ledger-bank">Bank</option>
                              </>
                            )}
                          </select>
                      </div>
                    )}
                    {voucherType === 'Receipt' ? (
                      <div>
                        <label className="field-label" htmlFor="receipt-counter">
                          Credit To (Receive from Customer or Income)
                        </label>
                        <select
                          id="receipt-counter"
                          className="saas-input"
                          style={{ backgroundColor: '#fff', color: '#111827', zIndex: 10, minHeight: '44px', width: '100%', appearance: 'auto', borderRadius: '6px', border: '1px solid #d1d5db', padding: '8px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
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
                          {customerParties.length > 0 && (
                            <optgroup label="Customers (Sundry Debtors)">
                              {customerParties.map((ledger) => (
                                <option key={ledger.id} value={ledger.id}>
                                  {ledger.name} (Customer)
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {supplierParties.length > 0 && (
                            <optgroup label="Suppliers (Sundry Creditors)">
                              {supplierParties.map((ledger) => (
                                <option key={ledger.id} value={ledger.id}>
                                  {ledger.name} (Supplier refund/adjustment)
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    ) : voucherType === 'Payment' ? (
                      <div>
                        <label className="field-label" htmlFor="payment-expense">
                          Debit To (Pay Supplier or Expense)
                        </label>
                        <select
                          id="payment-expense"
                          className="saas-input"
                          style={{ backgroundColor: '#fff', color: '#111827', zIndex: 10, minHeight: '44px', width: '100%', appearance: 'auto', borderRadius: '6px', border: '1px solid #d1d5db', padding: '8px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                          value={useExpenseInsteadOfSupplier ? voucherExpenseId : voucherPartyId}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (supplierParties.some((party) => party.id === value) || customerParties.some((party) => party.id === value)) {
                              setUseExpenseInsteadOfSupplier(false);
                              setVoucherPartyId(value);
                              return;
                            }
                            setUseExpenseInsteadOfSupplier(true);
                            setVoucherExpenseId(value);
                          }}
                        >
                          {supplierParties.length > 0 && (
                            <optgroup label="Suppliers (Pay Outstanding Bill)">
                              {supplierParties.map((ledger) => (
                                <option key={ledger.id} value={ledger.id}>
                                  {ledger.name} (Supplier)
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="Expense Categories">
                            {expenseLedgers.length > 0 ? (
                              expenseLedgers.map((ledger) => (
                                <option key={ledger.id} value={ledger.id}>
                                  {ledger.name}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="ledger-misc-expense">General Expense</option>
                                <option value="ledger-material">Material / Purchase</option>
                                <option value="ledger-rent">Rent</option>
                              </>
                            )}
                          </optgroup>
                          {customerParties.length > 0 && (
                            <optgroup label="Customers (Sundry Debtors)">
                              {customerParties.map((ledger) => (
                                <option key={ledger.id} value={ledger.id}>
                                  {ledger.name} (Customer)
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
                          className="saas-input"
                          style={{ backgroundColor: '#fff', color: '#111827', zIndex: 10, minHeight: '44px', width: '100%', appearance: 'auto', borderRadius: '6px', border: '1px solid #d1d5db', padding: '8px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
                          value={voucherPartyId}
                          onChange={(event) => {
                            setUseSalesInsteadOfParty(false);
                            setVoucherPartyId(event.target.value);
                          }}
                        >
                          <option value="">Select customer</option>
                          {customerParties.length > 0 && (
                            <optgroup label="Customers (Sundry Debtors)">
                              {customerParties.map((ledger) => (
                                <option key={ledger.id} value={ledger.id}>
                                  {ledger.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {supplierParties.length > 0 && (
                            <optgroup label="Suppliers (Sundry Creditors)">
                              {supplierParties.map((ledger) => (
                                <option key={ledger.id} value={ledger.id}>
                                  {ledger.name} (Supplier)
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        {customerParties.length === 0 && supplierParties.length > 0 && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#92400e', background: '#fef3c7', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                            💡 You have {supplierParties.length} supplier(s) registered (such as <strong>"{supplierParties[0]?.name}"</strong>). To record a bill from a supplier, switch to:
                            <div style={{ marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button type="button" onClick={() => { setVoucherType('Purchase'); setVoucherPartyId(supplierParties[0]?.id || ''); }} style={{ fontSize: '11px', padding: '4px 10px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', minHeight: 'unset', margin: 0 }}>📦 Switch to Purchase Voucher</button>
                              <button type="button" onClick={() => { setVoucherType('Payment'); setVoucherPartyId(supplierParties[0]?.id || ''); }} style={{ fontSize: '11px', padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', minHeight: 'unset', margin: 0 }}>💳 Switch to Payment Voucher</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : voucherType === 'Purchase' ? (
                      <>
                        <div>
                          <label className="field-label" htmlFor="purchase-ledger">
                            Purchase / Material
                          </label>
                          <select
                            id="purchase-ledger"
                            className="saas-input"
                            style={{
                              backgroundColor: '#fff',
                              color: '#111827',
                              zIndex: 10,
                              minHeight: '44px',
                              width: '100%',
                              appearance: 'auto',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              padding: '8px 12px',
                              fontSize: '14px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                            value={voucherExpenseId || MATERIAL_LEDGER_ID}
                            onChange={(event) => setVoucherExpenseId(event.target.value)}
                          >
                            {expenseLedgers.length > 0 ? (
                              expenseLedgers.map((ledger) => (
                                <option key={ledger.id} value={ledger.id}>
                                  {ledger.name} {ledger.group ? `(${ledger.group})` : ''}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="ledger-material">Material / Purchase (Purchase Accounts)</option>
                                <option value="ledger-raw-materials">Raw Materials (Purchase Accounts)</option>
                                <option value="ledger-packaging">Packaging Material (Purchase Accounts)</option>
                                <option value="ledger-freight">Transport / Freight (Direct Expenses)</option>
                                <option value="ledger-misc-expense">General Expense (Indirect Expenses)</option>
                                <option value="ledger-rent">Rent (Indirect Expenses)</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="field-label" htmlFor="purchase-supplier">
                            Supplier (credit purchase)
                          </label>
                          <select
                            id="purchase-supplier"
                            className="saas-input"
                            style={{
                              backgroundColor: '#fff',
                              color: '#111827',
                              zIndex: 10,
                              minHeight: '44px',
                              width: '100%',
                              appearance: 'auto',
                              borderRadius: '6px',
                              border: '1px solid #d1d5db',
                              padding: '8px 12px',
                              fontSize: '14px',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                            value={voucherPartyId}
                            onChange={(event) => {
                              setUseExpenseInsteadOfSupplier(false);
                              setVoucherPartyId(event.target.value);
                            }}
                          >
                            <option value="">Select supplier</option>
                            {supplierParties.length > 0 && (
                              <optgroup label="Suppliers (Sundry Creditors)">
                                {supplierParties.map((ledger) => (
                                  <option key={ledger.id} value={ledger.id}>
                                    {ledger.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {customerParties.length > 0 && (
                              <optgroup label="Customers (Sundry Debtors)">
                                {customerParties.map((ledger) => (
                                  <option key={ledger.id} value={ledger.id}>
                                    {ledger.name} (Customer)
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          {supplierParties.length === 0 && (
                            <div style={{ marginTop: '8px', fontSize: '12px', color: '#92400e', background: '#fef3c7', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                              💡 No suppliers saved yet. Enter your supplier name in the <strong>"Add Party (Khata)"</strong> form on the right with type <strong>"Supplier"</strong> to select them here.
                            </div>
                          )}
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
                        className="saas-input"
                        style={{ backgroundColor: '#fff', color: '#111827', zIndex: 10, minHeight: '44px', width: '100%', appearance: 'auto', borderRadius: '6px', border: '1px solid #d1d5db', padding: '8px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
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

              <article className="panel" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <h2>Recent Voucher Entries</h2>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['All', 'Receipt', 'Payment', 'Sales', 'Purchase'].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={`secondary-button compact-button ${voucherFilterType === tab ? 'active-filter' : ''}`}
                        style={{
                          background: voucherFilterType === tab ? '#1e3a8a' : '#f1f5f9',
                          color: voucherFilterType === tab ? '#ffffff' : '#334155',
                          border: '1px solid #cbd5e1',
                          padding: '4px 10px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: voucherFilterType === tab ? 600 : 400,
                        }}
                        onClick={() => setVoucherFilterType(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Account / Party</th>
                        <th>Narration</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers
                        .filter((v) => voucherFilterType === 'All' || v.type === voucherFilterType)
                        .slice(0, 15)
                        .map((v) => {
                          const amount = Number(v.amount || 0);
                          let accountName = v.partyName || v.party_name || v.accountName || v.account_name;
                          if (!accountName) {
                            const partyLine = (v.lines || []).find(
                              (l) => l.ledgerId !== CASH_LEDGER_ID && l.ledgerId !== 'ledger-bank' && l.ledgerId !== 'ledger-cash'
                            );
                            if (partyLine) {
                              accountName = ledgers.find((l) => l.id === partyLine.ledgerId)?.name || partyLine.ledgerId;
                            } else {
                              accountName = 'General / Cash';
                            }
                          }

                          return (
                            <tr key={v.id}>
                              <td>{v.date ? new Date(v.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor:
                                      v.type === 'Receipt' ? '#dcfce7' :
                                      v.type === 'Payment' ? '#dbeafe' :
                                      v.type === 'Sales' ? '#f3e8ff' : '#fed7aa',
                                    color:
                                      v.type === 'Receipt' ? '#166534' :
                                      v.type === 'Payment' ? '#1e40af' :
                                      v.type === 'Sales' ? '#6b21a8' : '#9a3412',
                                  }}
                                >
                                  {v.type || 'Receipt'}
                                </span>
                              </td>
                              <td><strong style={{ fontFamily: 'monospace' }}>₹{amount.toLocaleString('en-IN')}</strong></td>
                              <td><strong>{accountName}</strong></td>
                              <td style={{ color: '#475569', fontSize: '13px' }}>{v.narration || '--'}</td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="secondary-button compact-button"
                                    style={{ padding: '2px 8px', fontSize: '12px' }}
                                    onClick={() => editVoucher(v)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="danger-button compact-button"
                                    style={{ padding: '2px 8px', fontSize: '12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
                                    onClick={() => removeVoucher(v.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      {vouchers.filter((v) => voucherFilterType === 'All' || v.type === voucherFilterType).length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
                            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
                            <strong style={{ fontSize: '14px', color: '#1e293b' }}>No Vouchers Found</strong>
                            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                              {voucherFilterType === 'All'
                                ? 'No vouchers recorded yet. Fill the form above and click Save Voucher.'
                                : `No ${voucherFilterType} vouchers found.`}
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="panel" style={{ marginTop: '24px' }}>
                <h2>Party Ledger List</h2>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Party Name</th>
                        <th>Party Type</th>
                        <th>Group</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPartyLedgers(ledgers).slice(0, 5).map(ledger => (
                        <tr key={ledger.id}>
                          <td>{ledger.name}</td>
                          <td>{ledger.group === 'Sundry Creditors' ? 'Supplier' : 'Customer'}</td>
                          <td>{ledger.group}</td>
                        </tr>
                      ))}
                      {getPartyLedgers(ledgers).length === 0 && (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'center', padding: '24px' }} className="text-secondary">No party ledgers found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
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
                    className="saas-input"
                    style={{ backgroundColor: '#fff', color: '#111827', zIndex: 10, minHeight: '44px', width: '100%', appearance: 'auto', borderRadius: '6px', border: '1px solid #d1d5db', padding: '8px 12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
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

                    <div className="wide-field" style={{ marginTop: '16px', padding: '16px 18px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '20px' }}>💳</span>
                        <div>
                          <strong style={{ fontSize: '15px', color: '#14532d', display: 'block' }}>
                            Merchant UPI ID (VPA) & Digital Payments QR Code
                          </strong>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#166534' }}>
                            All invoice QR codes, Pay Now buttons, and Counter Standees will deposit payments directly into your bank account via this UPI ID.
                          </p>
                        </div>
                      </div>
                      <label className="field-label" htmlFor="profile-upi-id" style={{ marginTop: '10px', color: '#14532d', fontWeight: 600 }}>
                        Your Bank / App UPI ID (VPA)
                      </label>
                      <input
                        id="profile-upi-id"
                        name="profileUpiId"
                        key={profile.upiId || 'default-upi'}
                        defaultValue={profile.upiId || 'trinetr.namkeen@icici'}
                        placeholder="e.g. 9876543210@paytm, shopname@icici, mobile@okhdfcbank, name@ybl"
                        style={{ background: '#ffffff', borderColor: '#4ade80', fontWeight: 700, fontSize: '14px', color: '#0f172a' }}
                      />
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', fontSize: '11px', color: '#374151' }}>
                        <span>📱 <strong>Google Pay:</strong> Tap profile &rarr; UPI ID</span>
                        <span>📱 <strong>PhonePe:</strong> Tap profile photo &rarr; My QR / UPI ID</span>
                        <span>📱 <strong>Paytm:</strong> Tap top-left avatar &rarr; UPI ID</span>
                        <span>📱 <strong>BHIM:</strong> Home screen &rarr; Profile &rarr; UPI ID</span>
                      </div>
                    </div>

                    <div className="wide-field" style={{ marginTop: '24px', borderTop: '2px dashed var(--border, #e2e8f0)', paddingTop: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            🛍️ Customer Online Storefront & WhatsApp E-Commerce
                          </h3>
                          <p className="panel-hint" style={{ margin: '4px 0 0 0' }}>
                            Customize how your public online store looks to customers. Changes reflect immediately on your live storefront.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button compact-button"
                          onClick={() => {
                            setActiveTab('store');
                            window.location.hash = 'store';
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span>Preview Live Store ↗</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="field-label" htmlFor="profile-store-name">
                        Online Storefront Name
                      </label>
                      <input
                        id="profile-store-name"
                        name="profileStoreName"
                        defaultValue={profile.storeName || profile.name}
                        placeholder="e.g. Jay Ambe Namkeen or My Brand"
                      />
                      <span className="field-help" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Displays in storefront header, logo badge, and order confirmations.</span>
                    </div>

                    <div>
                      <label className="field-label" htmlFor="profile-whatsapp">
                        WhatsApp Orders Mobile Number *
                      </label>
                      <input
                        id="profile-whatsapp"
                        name="profileWhatsapp"
                        defaultValue={profile.whatsapp || profile.phone}
                        placeholder="+91 9979668339"
                        required
                      />
                      <span className="field-help" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Customers send 1-click cart orders directly to this WhatsApp number.</span>
                    </div>

                    <div className="wide-field">
                      <label className="field-label" htmlFor="profile-store-tagline">
                        Store Tagline / Subtitle
                      </label>
                      <input
                        id="profile-store-tagline"
                        name="profileStoreTagline"
                        defaultValue={profile.storeTagline || profile.tagline}
                        placeholder="e.g. Authentic Surat Farsan & Fresh Snacks"
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="profile-fssai">
                        FSSAI Food License Number
                      </label>
                      <input
                        id="profile-fssai"
                        name="profileFssai"
                        defaultValue={profile.fssaiNumber || ''}
                        placeholder="e.g. 10722026001234"
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="profile-hours">
                        Store Timings / Working Hours
                      </label>
                      <input
                        id="profile-hours"
                        name="profileHours"
                        defaultValue={profile.hours || 'Mon - Sun: 9:00 AM - 10:00 PM'}
                        placeholder="e.g. Mon - Sun: 9:00 AM - 10:00 PM"
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="profile-banner-offer">
                        Hero Banner Headline / Offer
                      </label>
                      <input
                        id="profile-banner-offer"
                        name="profileBannerOffer"
                        defaultValue={profile.bannerOffer || 'FLAT 20% OFF'}
                        placeholder="e.g. FLAT 20% OFF or FESTIVE SPECIAL"
                      />
                    </div>

                    <div>
                      <label className="field-label" htmlFor="profile-banner-region">
                        Banner Subtitle / Delivery Area
                      </label>
                      <input
                        id="profile-banner-region"
                        name="profileBannerRegion"
                        defaultValue={profile.bannerRegion || "For All Gujarat and Mumbai City's Customers"}
                        placeholder="e.g. Free Delivery Across Surat on Orders Above ₹500"
                      />
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

          {activeTab === 'profile' && (
            <section className="panel fade-in" id="profile">
              <div className="section-header">
                <div>
                  <h2>My Profile</h2>
                  <p className="panel-hint">Manage your personal account and identity.</p>
                </div>
              </div>
              <div style={{ padding: '24px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                    {(authUser?.email || profile.owner || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0' }}>{profile.owner || 'Admin User'}</h3>
                    <div style={{ color: 'var(--text-secondary)' }}>{authUser?.email || 'user@example.com'}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>Business Connection</div>
                    <div style={{ fontWeight: '500' }}>{profile.name || 'Not set'}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>Account Role</div>
                    <div style={{ fontWeight: '500' }}>Owner / Administrator</div>
                  </div>
                </div>
                <div style={{ marginTop: '24px' }}>
                  <button type="button" className="secondary-button" onClick={() => navigateToTab('app-settings')}><Edit3 size={16}/> Edit Company Profile</button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'billing' && (
            <section className="panel fade-in" id="billing">
              <div className="section-header">
                <div>
                  <h2>Billing & Plans</h2>
                  <p className="panel-hint">Manage your subscription, view invoices, and update payment methods.</p>
                </div>
              </div>
              <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px dashed var(--border-subtle)' }}>
                <CreditCard size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', marginLeft: 'auto', marginRight: 'auto', display: 'block' }} />
                <h3 style={{ margin: '0 0 8px 0' }}>Billing & Plans coming soon</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                  You are currently on the free beta plan. Subscription and payment integration will be available in a future update.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button type="button" className="secondary-button" onClick={() => { setActiveTab('app-settings'); window.location.hash = 'app-settings'; }}>Go to Settings</button>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'preferences' && (
            <PreferencesPanel 
              userPreferences={userPreferences} 
              setUserPreferences={setUserPreferences} 
              setStatus={setStatus} 
              DEFAULT_PREFERENCES={DEFAULT_PREFERENCES} 
            />
          )}

          {activeTab === 'help' && (
            <section className="panel fade-in" id="help">
              <div className="section-header">
                <div>
                  <h2>Help Center</h2>
                  <p className="panel-hint">Support and guides for Trinetr Business Suite.</p>
                </div>
              </div>
              <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px dashed var(--border-subtle)' }}>
                <HelpCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', marginLeft: 'auto', marginRight: 'auto', display: 'block' }} />
                <h3 style={{ margin: '0 0 8px 0' }}>Need Help?</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px 0' }}>
                  You can access all support guides and contact information from the Help Center modal.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button type="button" className="primary-button" onClick={() => setIsHelpCenterOpen(true)}>Open Help Center</button>
                </div>
              </div>
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
        <a className={['entries', 'voucher-entry', 'day-book'].includes(activeTab) ? 'active' : ''} href="#day-book">Entries</a>
        <a className={['parties', 'crm', 'party-management', 'suppliers'].includes(activeTab) ? 'active' : ''} href="#crm">Parties</a>
        <a className={['stock', 'inventory'].includes(activeTab) ? 'active' : ''} href="#inventory">Stock</a>
        <a className={activeTab === 'more' ? 'active' : ''} href="#more">More</a>
      </nav>

      {/* High-Performance Voice Manager Widget */}
      {import.meta.env.VITE_ENABLE_VOICE_ASSISTANT === 'true' && (
        <div className="voice-manager-widget" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          {state === 'idle' && (
            <div className="voice-prompt" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              Tap mic to speak
            </div>
          )}
          {state === 'error' && (
            <div className="voice-error" style={{ color: 'red', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              {error || 'Error accessing microphone'}
            </div>
          )}
          <button 
            className="floating-mic-btn"
            disabled={state === 'processing'}
            onClick={() => {
              if (state === 'listening') {
                stopListening();
              } else {
                startListening();
              }
            }}
            type="button"
            style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)', cursor: state === 'processing' ? 'not-allowed' : 'pointer', position: 'relative' }}
          >
            {state === 'idle' && <span className="mic-icon" style={{ fontSize: '24px' }}>🎤</span>}
            {state === 'listening' && (
              <div 
                ref={waveRef} 
                style={{ width: '20px', height: '4px', background: 'white', borderRadius: '2px', transition: 'transform 0.05s ease-out', transformOrigin: 'center' }} 
              />
            )}
            {state === 'processing' && (
              <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            )}
          </button>
        </div>
      )}

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
      <SafeHelpCenterModal isOpen={isHelpCenterOpen} onClose={() => setIsHelpCenterOpen(false)} />
    </div>
  );
}

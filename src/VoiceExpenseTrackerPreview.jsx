import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
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
import { LegalPage, LEGAL_PAGE_IDS } from './LegalPages.jsx';
import {
  createSupabaseAccount,
  deleteCloudRecord,
  getSupabaseUrl,
  getSupabaseAuthErrorMessage,
  getSupabaseProjectHost,
  isSupabaseConfigured,
  isPasswordRecoveryRoute,
  listenToSupabaseAuth,
  loadCloudCollection,
  loadUserProfileSettings,
  prepareSupabasePasswordRecoverySession,
  reloadCurrentSupabaseUser,
  runSupabaseDebugTest,
  saveCloudRecord,
  saveUserProfile,
  saveUserProfileSettings,
  sendCurrentUserEmailVerification,
  sendSupabasePasswordReset,
  signInSupabaseAccount,
  signInSupabaseGoogle,
  signOutSupabase,
  updateCurrentUserPassword,
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
  name: 'Voice Business Tracker',
  tagline: 'Cash book and party khata for small business',
  logo: '/assets/logo.svg',
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
      { id: 'company-setup', path: '#company-setup', tab: 'company-setup', label: 'Company Setup', icon: '▣' },
      { id: 'ai-insights', path: '#ai-assistant', tab: 'ai-assistant', label: 'AI Insights', icon: '✣' },
      { id: 'analytics', path: '#analytics', tab: 'analytics', label: 'Analytics', icon: '⌁' },
      { id: 'notifications', path: '#notifications', tab: 'notifications', label: 'Notifications', icon: '◌' },
    ],
  },
  {
    id: 'tally-structure',
    label: 'Business Structure',
    icon: '◇',
    children: [
      { id: 'company-master', path: '#company-setup', tab: 'company-setup', label: 'Company Master', icon: '▦' },
      { id: 'branches', path: '#businesses', tab: 'businesses', label: 'Branches', icon: '⌖' },
      { id: 'departments', path: '#businesses', tab: 'businesses', label: 'Departments', icon: '☷' },
      { id: 'products-services', path: '#inventory', tab: 'inventory', label: 'Products / Services', icon: '⬡' },
      { id: 'units', path: '#inventory', tab: 'inventory', label: 'Units', icon: '◇' },
      { id: 'categories', path: '#masters', tab: 'masters', label: 'Categories', icon: '◈' },
      { id: 'warehouses', path: '#inventory', tab: 'inventory', label: 'Warehouses', icon: '▤' },
    ],
  },
  {
    id: 'erp',
    label: 'ERP Modules',
    icon: '▦',
    children: [
      { id: 'sales', path: '#voucher-entry', tab: 'voucher-entry', label: 'Sales', icon: '▿' },
      { id: 'purchase', path: '#voucher-entry', tab: 'voucher-entry', label: 'Purchase', icon: '▵' },
      { id: 'inventory', path: '#inventory', tab: 'inventory', label: 'Inventory', icon: '⬢' },
      { id: 'accounting', path: '#accounting-ledgers', tab: 'accounting-ledgers', label: 'Accounting', icon: '▤' },
      { id: 'banking', path: '#day-book', tab: 'day-book', label: 'Banking', icon: '▥' },
    ],
  },
  {
    id: 'people',
    label: 'People & Ledger',
    icon: '◉',
    children: [
      { id: 'customers', path: '#crm', tab: 'crm', label: 'Customers', icon: '☉' },
      { id: 'suppliers', path: '#suppliers', tab: 'suppliers', label: 'Suppliers', icon: '◎' },
      { id: 'employees', path: '#employees', tab: 'employees', label: 'Employees', icon: '♙' },
      { id: 'ledger', path: '#party-statement', tab: 'party-statement', label: 'Ledger', icon: '▣' },
    ],
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: '⚡',
    children: [
      { id: 'workflows', path: '#mobile-app', tab: 'mobile-app', label: 'Workflows', icon: '⎇' },
      { id: 'reminders', path: '#notifications', tab: 'notifications', label: 'Reminders', icon: '◷' },
      { id: 'automations', path: '#whatsapp-automation', tab: 'whatsapp-automation', label: 'Automations', icon: '⚡' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin & Security',
    icon: '◈',
    children: [
      { id: 'users-roles', path: '#security-center', tab: 'security-center', label: 'Users & Roles', icon: '☷' },
      { id: 'permissions', path: '#security-center', tab: 'security-center', label: 'Permissions', icon: '◇' },
      { id: 'audit-logs', path: '#reports-hub', tab: 'reports-hub', label: 'Audit Logs', icon: '▱' },
      { id: 'system-settings', path: '#app-settings', tab: 'app-settings', label: 'System Settings', icon: '⚙' },
      { id: 'database-test', path: '#database-test', tab: 'database-test', label: 'Database Test', icon: '◉', debugOnly: true },
    ],
  },
];
const SIDEBAR_SECTIONS = navigationConfig;

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
  
  const height = 160;
  const width = 360;
  const paddingLeft = 45;
  const paddingBottom = 25;
  const paddingTop = 15;
  const paddingRight = 15;
  
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
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length-1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` 
    : '';

  return (
    <div className="svg-chart-container">
      <h3 className="chart-title">Monthly Net Profit Trend</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const val = Math.round(minVal + (maxVal - minVal) * ratio);
          let y = paddingTop + chartHeight * (1 - ratio);
          if (isNaN(y)) y = paddingTop;
          return (
            <g key={idx}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--border-main)" strokeDasharray="3 3" opacity="0.5" />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">
                {val >= 0 ? (val >= 1000 ? `${(val/1000).toFixed(0)}k` : val) : (val <= -1000 ? `-${(Math.abs(val)/1000).toFixed(0)}k` : val)}
              </text>
            </g>
          );
        })}

        {/* Zero baseline */}
        {minVal < 0 && (
          <line x1={paddingLeft} y1={zeroY} x2={width - paddingRight} y2={zeroY} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" opacity="0.8" />
        )}

        {/* Area fill */}
        {areaPath && (
          <path d={areaPath} fill="url(#profitGrad)" opacity="0.15" />
        )}

        {/* Line */}
        {linePath && (
          <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
        )}

        <defs>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Data points */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="8" fontWeight="bold" fill="var(--text-main)">
              {p.profit >= 0 ? `${p.profit >= 1000 ? (p.profit/1000).toFixed(0)+'k' : p.profit}` : `-${Math.abs(p.profit) >= 1000 ? (Math.abs(p.profit)/1000).toFixed(0)+'k' : Math.abs(p.profit)}`}
            </text>
            <text x={p.x} y={height - paddingBottom + 14} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
              {p.label}
            </text>
          </g>
        ))}

        {/* Baseline */}
        <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="var(--border-main)" strokeWidth="1.5" />
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
  const [secureError, setSecureError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [verificationResending, setVerificationResending] = useState(false);
  const [passwordResetCooldown, setPasswordResetCooldown] = useState(0);
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
  const [cloudPayments, setCloudPayments] = useState([]);
  const [cloudAuditLogs, setCloudAuditLogs] = useState([]);
  const [cloudSubscription, setCloudSubscription] = useState(null);
  const [cloudSecurity, setCloudSecurity] = useState(null);
  const [cloudDevices, setCloudDevices] = useState([]);
  const [cloudOfflineQueue, setCloudOfflineQueue] = useState([]);
  const [cloudBusinesses, setCloudBusinesses] = useState([]);
  const [cloudNotifications, setCloudNotifications] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [manualType, setManualType] = useState('Expense');
  const [manualAmount, setManualAmount] = useState('');
  const [manualText, setManualText] = useState('');
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [openSidebarSections, setOpenSidebarSections] = useState({
    overview: true,
    'tally-structure': true,
    erp: true,
    people: true,
    automation: true,
    admin: true,
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarSectionRefs = useRef({});
  const recoverySessionPreparedRef = useRef(false);
  const passwordResetInFlightRef = useRef(false);
  const hasVerifiedAccess = !REQUIRE_VERIFIED_EMAIL || Boolean(authUser?.emailVerified);
  const canViewDatabaseDebug = import.meta.env.DEV || authUser?.role === 'Owner';
  const canViewAuthDebug = import.meta.env.DEV || import.meta.env.VITE_DEBUG_AUTH === 'true';
  const activeSidebarSection = SIDEBAR_SECTIONS.find((group) => group.children.some((child) => child.tab === activeTab));
  const activeSidebarItem = activeSidebarSection?.children.find((child) => child.tab === activeTab);
  const activePageTitle = activeSidebarItem?.label || 'Dashboard';

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
    const scopedUser = {
      ...nextUser,
      uid: nextUser.uid || nextUser.email,
      role: nextUser.role || 'Owner',
      loginAt: new Date().toISOString(),
    };

    setStorageScope(scopedUser.uid || scopedUser.email);
    if (!import.meta.env.PROD) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(scopedUser));
    }
    setAuthUser(scopedUser);
    setAuthView(REQUIRE_VERIFIED_EMAIL && !scopedUser.emailVerified ? 'verify-email' : 'app');
    setSecureError('');

    if (REQUIRE_VERIFIED_EMAIL && !scopedUser.emailVerified) {
      setStatus('Email verification required');
      return;
    }

    let cloudTransactions = null;
    let cloudProfile = null;
    if (restoreCloud && supabaseEnabled && scopedUser.uid) {
      const transactionPath = `users/${scopedUser.uid}/transactions`;
      debugInfo('SUPABASE_PATH_USED', {
        feature: 'transactions_load',
        path: transactionPath,
        uid: scopedUser.uid,
      });
      setTransactionsLoading(true);
      setPeopleLoading(true);
      const loadModuleCollection = async (tableName) => {
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
      const payments = paymentsResult.ok ? paymentsResult.rows : [];
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
        if (supabaseUser?.emailVerified) {
          setStatus('Secure Supabase login active');
        } else {
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
      setSecureError(`Please wait ${passwordResetCooldown}s before requesting another reset email.`);
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
        setPasswordResetCooldown(60);
      }
      setSecureError(message);
      setAuthNotice('');
      setStatus(message);
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
    setCloudPayments([]);
    setCloudAuditLogs([]);
    setCloudSubscription(null);
    setCloudSecurity(null);
    setCloudDevices([]);
    setCloudOfflineQueue([]);
    setCloudBusinesses([]);
    setCloudNotifications([]);
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
    localStorage.setItem('darkMode', String(darkMode));
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

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
      app: 'Voice Business Tracker',
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

  if (authView !== 'app') {
    return (
      <main className="saas-public-shell">
        <header className="saas-nav">
          <a className="saas-logo" href="#home" onClick={() => setAuthView('landing')}>
            <img src={profile.logo} alt="" />
            <span>Voice Business Tracker</span>
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
              <span>Voice Business Tracker</span>
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
                <form onSubmit={resetPassword}>
                  <label className="field-label" htmlFor="reset-email">Registered Email</label>
                  <input id="reset-email" name="email" type="email" placeholder="owner@business.com" autoComplete="email" />
                  <button className="saas-primary-button full" type="submit" disabled={authLoading || !supabaseEnabled || passwordResetCooldown > 0}>
                    {authLoading ? 'Sending...' : passwordResetCooldown > 0 ? `Try again in ${passwordResetCooldown}s` : 'Send Reset Link'}
                  </button>
                  <button className="saas-google-button" type="button" onClick={() => setAuthView('login')} disabled={authLoading}>
                    Back to Login
                  </button>
                </form>
              ) : (
              <form onSubmit={completeAuth}>
                {authView === 'register' && (
                  <>
                    <label className="field-label" htmlFor="auth-business">Business Name</label>
                    <input id="auth-business" name="businessName" placeholder="Your business name" />
                    <label className="field-label" htmlFor="auth-owner">Owner Name</label>
                    <input id="auth-owner" name="ownerName" placeholder="Owner name" />
                  </>
                )}
                <label className="field-label" htmlFor="auth-email">Email</label>
                <input id="auth-email" name="email" type="email" placeholder="owner@business.com" autoComplete="email" />
                <label className="field-label" htmlFor="auth-password">Password</label>
                <input id="auth-password" name="password" type="password" placeholder="••••••••" autoComplete={authView === 'login' ? 'current-password' : 'new-password'} />
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
              <button className="saas-google-button" type="button" onClick={loginWithGoogle} disabled={authLoading}>
                {authLoading ? 'Connecting...' : 'Continue with Google'}
              </button>
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
            <span>Voice Business Tracker</span>
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
      <aside className="sidebar" aria-label="Main menu">
        <div className="sidebar-brand">
          <img className="sidebar-logo" src={profile.logo} alt="" />
          <div>
            <strong>Voice Business Tracker</strong>
            <span>Business Console</span>
          </div>
          <button className="drawer-close-button" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)}>
            ×
          </button>
        </div>
        <div className="sidebar-status-card" aria-label="Connection status">
          <span className="sidebar-status-kicker">Secure Supabase Login</span>
          <strong>{status}</strong>
          <div className="runtime-badges sidebar-runtime-badges">
            <span className={`runtime-pill ${supabaseEnabled ? 'live' : 'demo'}`}>
              {supabaseEnabled ? 'Supabase protected' : 'Local demo'}
            </span>
            <span className={`runtime-pill ${offline ? 'offline' : 'online'}`}>
              {offline ? 'Offline' : 'Online'}
            </span>
            <span className="runtime-pill role">{authUser?.role || 'Guest'}</span>
          </div>
        </div>
        <nav className="erp-nav-list" aria-label="ERP sections">
          {SIDEBAR_SECTIONS.map((section) => ({
            ...section,
            children: section.children.filter((child) => !child.debugOnly || canViewDatabaseDebug),
          })).filter((section) => section.children.length > 0).map((section) => {
            const isExpanded = openSidebarSections[section.id] ?? true;
            const hasActiveItem = section.children.some((child) => child.tab === activeTab);

            return (
              <div
                className={`erp-nav-group ${isExpanded ? 'is-open' : ''} ${hasActiveItem ? 'is-active' : ''}`}
                data-open={isExpanded ? 'true' : 'false'}
                key={section.id}
                ref={(node) => {
                  sidebarSectionRefs.current[section.id] = node;
                }}
              >
                <button
                  aria-expanded={isExpanded}
                  className="erp-nav-trigger"
                  type="button"
                  onClick={() => toggleSidebarSection(section.id)}
                >
                  <span className="erp-nav-title">
                    <span className="erp-nav-section-icon">{section.icon}</span>
                    <span>{section.label}</span>
                  </span>
                  <span className="erp-nav-chevron">›</span>
                </button>
                <div className="erp-nav-children" aria-hidden={!isExpanded}>
                  {section.children.map((child) => (
                    <a
                      href={child.path}
                      className={`erp-nav-link ${activeTab === child.tab ? 'is-active' : ''}`}
                      key={child.id}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <span className="erp-nav-child-icon">{child.icon || '•'}</span>
                      <span>{child.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-support">
          <strong>Need Help?</strong>
          <span>Contact our support team for any assistance.</span>
          <a className="sidebar-support-button" href="#support">Contact Support</a>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button
            className="topbar-menu-button"
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            ☰
          </button>
          <div className="topbar-title">
            <span className="eyebrow">{activeSidebarSection?.label || 'Overview'}</span>
            <strong>{activePageTitle}</strong>
          </div>
          <div className="topbar-search">
            <span>⌕</span>
            <input type="search" placeholder="Search vouchers, customers, inventory..." aria-label="Search business records" />
          </div>
          <div className="topbar-actions">
            <input className="topbar-date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} aria-label="Dashboard date" />
            <button 
              className="topbar-link dark-mode-toggle-btn"
              onClick={() => setDarkMode(!darkMode)}
              type="button"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <a className="topbar-link notification-link" href="#notifications">Alerts</a>
            <a className="topbar-link" href="#profile-settings">Profile</a>
            <a className="topbar-link" href="#app-settings">Settings</a>
            <button className="topbar-link" type="button" onClick={logout}>Logout</button>
            <a className="topbar-link primary" href="#support">Support</a>
          </div>
        </header>

        <main className="page-shell">
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
            <section className="erp-dashboard fade-in" id="dashboard">
              <div className="dashboard-command-center">
                <div className="dashboard-welcome-card">
                  <span className="eyebrow">Welcome back</span>
                  <h1>Welcome back, {profile.owner || 'Admin'}!</h1>
                  <p>Here's what's happening with your business today.</p>
                </div>
              </div>

              {!browserSupported && (
                <div className="notice error">
                  Your browser does not support voice recognition. Please use Google Chrome.
                </div>
              )}

              {transactionsLoading && (
                <div className="notice">
                  Loading dashboard transactions from Supabase...
                </div>
              )}

              <div className="dashboard-summary-grid">
                <article className="stat-card-modern">
                  <div className="stat-card-header">
                    <span>Total Revenue</span>
                    <span className="stat-icon-badge text-green">₹</span>
                  </div>
                  <strong>{formatCurrency(stats.monthlySales)}</strong>
                  <p>Monthly revenue from sales and receipts</p>
                </article>

                <article className="stat-card-modern">
                  <div className="stat-card-header">
                    <span>Total Expenses</span>
                    <span className="stat-icon-badge text-red">₹</span>
                  </div>
                  <strong>{formatCurrency(stats.monthlyExpenses)}</strong>
                  <p>Purchases, payments, and expense vouchers</p>
                </article>

                <article className="stat-card-modern">
                  <div className="stat-card-header">
                    <span>Net Profit</span>
                    <span className={`growth-badge ${netProfitGrowth >= 0 ? 'growth-up' : 'growth-down'}`}>{netProfitGrowth >= 0 ? '↑' : '↓'} {Math.abs(netProfitGrowth)}%</span>
                  </div>
                  <strong className={monthlyNetProfit >= 0 ? 'text-green' : 'text-red'}>{formatCurrency(monthlyNetProfit)}</strong>
                  <p>Revenue minus expenses</p>
                </article>

                <article className="stat-card-modern">
                  <div className="stat-card-header">
                    <span>Total Transactions</span>
                    <span className="stat-icon-badge text-blue">#</span>
                  </div>
                  <strong>{vouchers.length}</strong>
                  <p>Synced vouchers in this business</p>
                </article>
              </div>

              {vouchers.length === 0 && (
                <div className="empty-state-panel">
                  <strong>No transactions yet</strong>
                  <p>Tap the microphone or create a voucher to start building your business dashboard.</p>
                  <div>
                    <button className="manual-button compact-button" type="button" onClick={startVoiceRecognition}>
                      Start Voice Entry
                    </button>
                    <a className="secondary-button compact-link" href="#voucher-entry">Add Voucher</a>
                  </div>
                </div>
              )}

              <div className="dashboard-analytics-grid">
                <section className="dashboard-glass-panel wide">
                  <div className="section-header">
                    <div>
                      <span className="eyebrow">Business overview</span>
                      <h2>Revenue vs Expenses</h2>
                    </div>
                  </div>
                  <MiniBarChart data={getLast6MonthsData(vouchers)} valueKey="sales" barColor="#8b5cf6" title="Monthly Sales" />
                  <ProfitTrendChart data={getLast6MonthsData(vouchers)} />
                </section>
                <section className="dashboard-glass-panel quick-actions-panel">
                  <div className="section-header">
                    <div>
                      <span className="eyebrow">Fast entries</span>
                      <h2>Quick Actions</h2>
                    </div>
                  </div>
                  <div className="quick-action-console">
                    {[
                      ['Add Sale', 'voucher-entry', '▣'],
                      ['Add Expense', 'voucher-entry', '▤'],
                      ['Add Customer', 'crm', '☉'],
                      ['Add Supplier', 'suppliers', '◎'],
                      ['Create Invoice', 'invoices', '▧'],
                    ].map(([label, href, icon]) => (
                      <a className="quick-action-tile" href={`#${href}`} key={label}>
                        <span>{icon}</span>
                        <strong>{label}</strong>
                        <b>›</b>
                      </a>
                    ))}
                  </div>
                </section>
                <section className="dashboard-glass-panel">
                  <div className="section-header">
                    <div>
                      <span className="eyebrow">Top expenses</span>
                      <h2>Expense Trend</h2>
                    </div>
                  </div>
                  <MiniBarChart data={getLast6MonthsData(vouchers)} valueKey="expenses" barColor="#ef4444" title="Monthly Expenses" />
                </section>
                <section className="dashboard-glass-panel">
                  <div className="section-header">
                    <div>
                      <span className="eyebrow">Recent activity</span>
                      <h2>Recent Transactions</h2>
                    </div>
                    <a className="secondary-button compact-link" href="#day-book">Day Book</a>
                  </div>
                  <div className="activity-list">
                    {(recentVouchers.length ? recentVouchers : vouchers.slice(0, 1)).map((voucher) => (
                      <article className="activity-item" key={voucher.id}>
                        <div>
                          <p className={`activity-type voucher-${String(voucher.type || 'voucher').toLowerCase()}`}>{voucher.type || 'Voucher'}</p>
                          <p className="voucher-narration">{voucher.narration}</p>
                          <p className="voucher-meta">{voucher.date} · {counterLabel(voucher)} · {voucher.source || 'manual'}</p>
                        </div>
                        <strong>{formatCurrency(voucher.amount)}</strong>
                      </article>
                    ))}
                    {!recentVouchers.length && !vouchers.length && <div className="empty-state">No recent transactions.</div>}
                  </div>
                </section>
                <section className="dashboard-glass-panel">
                  <div className="section-header">
                    <div>
                      <span className="eyebrow">AI insights</span>
                      <h2>Business Health</h2>
                    </div>
                    <strong>{aiInsights.score}/100</strong>
                  </div>
                  <div className="ai-list good">
                    <p>{aiInsights.suggestions[0] || 'Add transactions to unlock smarter business insights.'}</p>
                    <p>Cash balance: {formatCurrency(cashInHand)}</p>
                    <p>Receivables: {formatCurrency(receivableTotal)}</p>
                  </div>
                </section>
                <section className="dashboard-glass-panel support-console-card">
                  <span className="eyebrow">Support</span>
                  <h2>Need help?</h2>
                  <p>Contact support for setup, Supabase, or business workflow help.</p>
                  <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
                  <a href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>
                </section>
                <section className="dashboard-glass-panel">
                  <TopCustomersChart data={getTopCustomers(partySummary)} />
                </section>
              </div>
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
                onCloudSnapshot={saveCloudDataSnapshot}
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
            <section className="panel fade-in" id="party-management">
              <div className="section-header">
                <div>
                  <h2>Party Khata Management</h2>
                  <p className="panel-hint">Track outstanding customer receivables, supplier payables, and sales histories.</p>
                </div>
                <span className="info-badge">{partySummary.length} Parties</span>
              </div>

              <div className="party-table-wrap">
                <table className="statement-table">
                  <thead>
                    <tr>
                      <th>Party Name</th>
                      <th>Type</th>
                      <th>Total Invoices (Sales/Purchases)</th>
                      <th>Total Payments Received/Made</th>
                      <th>Outstanding Balance</th>
                      <th>Last Active Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partySummary.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-state">No parties added yet. Go to Voucher Entry to add a customer or supplier.</td>
                      </tr>
                    ) : (
                      partySummary.map((party) => {
                        const isDebtor = party.group === 'Sundry Debtors';
                        const balance = party.outstandingAmount;
                        
                        return (
                          <tr key={party.id}>
                            <td><strong>{party.name}</strong></td>
                            <td>
                              <span className={`badge ${isDebtor ? 'badge-debtor' : 'badge-creditor'}`}>
                                {isDebtor ? 'Customer' : 'Supplier'}
                              </span>
                            </td>
                            <td>{formatCurrency(party.totalSales)}</td>
                            <td>{formatCurrency(party.totalPayments)}</td>
                            <td>
                              <strong className={balance > 0 ? (isDebtor ? 'text-amber' : 'text-red') : 'text-green'}>
                                {balance === 0 ? 'Settled' : isDebtor ? `${formatCurrency(balance)} Dr` : `${formatCurrency(Math.abs(balance))} Cr`}
                              </strong>
                            </td>
                            <td>{party.lastTransactionDate}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
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
                  <button className="secondary-button compact-button" type="button" onClick={() => { window.location.hash = 'profile-settings'; }}>
                    Open Profile
                  </button>
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







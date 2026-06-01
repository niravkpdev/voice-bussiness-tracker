import { readScopedString, writeScopedString } from './storageScope.js';

export const LEDGERS_KEY = 'businessLedgers';
export const VOUCHERS_KEY = 'businessVouchers';

export const DEFAULT_LEDGERS = [
  {
    id: 'ledger-cash',
    name: 'Cash',
    group: 'Cash-in-hand',
    openingBalance: 0,
    balanceType: 'debit',
  },
  {
    id: 'ledger-bank',
    name: 'Bank',
    group: 'Bank Accounts',
    openingBalance: 0,
    balanceType: 'debit',
  },
  {
    id: 'ledger-sales',
    name: 'Sales',
    group: 'Sales Accounts',
    openingBalance: 0,
    balanceType: 'credit',
  },
  {
    id: 'ledger-material',
    name: 'Material / Purchase',
    group: 'Purchase Accounts',
    openingBalance: 0,
    balanceType: 'debit',
  },
  {
    id: 'ledger-rent',
    name: 'Rent',
    group: 'Indirect Expenses',
    openingBalance: 0,
    balanceType: 'debit',
  },
  {
    id: 'ledger-misc-expense',
    name: 'General Expense',
    group: 'Indirect Expenses',
    openingBalance: 0,
    balanceType: 'debit',
  },
];

const PARTY_GROUPS = new Set(['Sundry Debtors', 'Sundry Creditors']);

export function readSavedArray(key) {
  try {
    const savedItems = JSON.parse(readScopedString(key) || '[]');
    return Array.isArray(savedItems) ? savedItems : [];
  } catch {
    return [];
  }
}

export function writeSavedArray(key, items) {
  writeScopedString(key, JSON.stringify(items));
}

export function readLedgers() {
  return readSavedArray(LEDGERS_KEY);
}

export function readVouchers() {
  return readSavedArray(VOUCHERS_KEY);
}

export function ensureDefaultLedgers() {
  const existing = readLedgers();
  if (existing.length > 0) {
    return existing;
  }
  writeSavedArray(LEDGERS_KEY, DEFAULT_LEDGERS);
  return DEFAULT_LEDGERS;
}

export function createLedgerId(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `ledger-party-${slug}-${Date.now().toString(36)}`;
}

export function createVoucherId() {
  return `vch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function sumSide(lines, side) {
  return lines.reduce((total, line) => total + (line[side] || 0), 0);
}

export function isBalanced(lines) {
  const debits = sumSide(lines, 'debit');
  const credits = sumSide(lines, 'credit');
  return debits > 0 && debits === credits;
}

export function buildReceiptLines(amount, cashLedgerId, creditLedgerId) {
  return [
    { ledgerId: cashLedgerId, debit: amount, credit: 0 },
    { ledgerId: creditLedgerId, debit: 0, credit: amount },
  ];
}

export function buildPaymentLines(amount, debitLedgerId, cashLedgerId) {
  return [
    { ledgerId: debitLedgerId, debit: amount, credit: 0 },
    { ledgerId: cashLedgerId, debit: 0, credit: amount },
  ];
}

/** Credit sale: customer owes you — Dr Sundry Debtor, Cr Sales */
export function buildCreditSaleLines(amount, customerLedgerId, salesLedgerId) {
  return [
    { ledgerId: customerLedgerId, debit: amount, credit: 0 },
    { ledgerId: salesLedgerId, debit: 0, credit: amount },
  ];
}

/** Credit purchase: you owe supplier — Dr Purchase, Cr Sundry Creditor */
export function buildCreditPurchaseLines(amount, purchaseLedgerId, supplierLedgerId) {
  return [
    { ledgerId: purchaseLedgerId, debit: amount, credit: 0 },
    { ledgerId: supplierLedgerId, debit: 0, credit: amount },
  ];
}

export function createVoucher({ type, amount, narration, lines, source = 'manual', date }) {
  if (!isBalanced(lines)) {
    throw new Error('Voucher lines must balance with a positive amount');
  }

  return {
    id: createVoucherId(),
    date: date || new Date().toISOString().slice(0, 10),
    dateTime: new Date().toLocaleString(),
    type,
    amount,
    narration,
    lines,
    source,
  };
}

export function saveVoucher(voucher) {
  const vouchers = [voucher, ...readVouchers()];
  writeSavedArray(VOUCHERS_KEY, vouchers);
  return vouchers;
}

export function deleteVoucher(voucherId) {
  const vouchers = readVouchers().filter((voucher) => voucher.id !== voucherId);
  writeSavedArray(VOUCHERS_KEY, vouchers);
  return vouchers;
}

export function addPartyLedger(name, partyType) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Party name is required');
  }

  const group = partyType === 'supplier' ? 'Sundry Creditors' : 'Sundry Debtors';
  const balanceType = partyType === 'supplier' ? 'credit' : 'debit';
  const ledgers = readLedgers();
  const duplicate = ledgers.find(
    (ledger) => ledger.name.toLowerCase() === trimmed.toLowerCase() && ledger.group === group
  );

  if (duplicate) {
    return { ledgers, ledger: duplicate };
  }

  const ledger = {
    id: createLedgerId(trimmed),
    name: trimmed,
    group,
    openingBalance: 0,
    balanceType,
  };

  const nextLedgers = [ledger, ...ledgers];
  writeSavedArray(LEDGERS_KEY, nextLedgers);
  return { ledgers: nextLedgers, ledger };
}

export function getPartyLedgers(ledgers) {
  return ledgers.filter((ledger) => PARTY_GROUPS.has(ledger.group));
}

export function getCashLedgers(ledgers) {
  return ledgers.filter((ledger) => ledger.group === 'Cash-in-hand' || ledger.group === 'Bank Accounts');
}

export function getExpenseLedgers(ledgers) {
  return ledgers.filter(
    (ledger) =>
      ledger.group === 'Purchase Accounts' ||
      ledger.group === 'Indirect Expenses' ||
      ledger.group === 'Sales Accounts'
  );
}

export function getLedgerById(ledgers, ledgerId) {
  return ledgers.find((ledger) => ledger.id === ledgerId);
}

export function ledgerDisplayBalance(ledger, balance) {
  if (ledger.balanceType === 'debit') {
    return balance;
  }
  return -balance;
}

export function computeLedgerBalance(ledgerId, ledgers, vouchers) {
  const ledger = getLedgerById(ledgers, ledgerId);
  if (!ledger) {
    return 0;
  }

  let debits = 0;
  let credits = 0;

  vouchers.forEach((voucher) => {
    voucher.lines.forEach((line) => {
      if (line.ledgerId !== ledgerId) {
        return;
      }
      debits += line.debit || 0;
      credits += line.credit || 0;
    });
  });

  const net = debits - credits + (ledger.openingBalance || 0);
  return ledger.balanceType === 'debit' ? net : -net;
}

export function getLedgerStatement(ledgerId, ledgers, vouchers) {
  const ledger = getLedgerById(ledgers, ledgerId);
  if (!ledger) {
    return { ledger: null, rows: [], closingBalance: 0 };
  }

  const rows = [];
  let running =
    ledger.balanceType === 'debit' ? ledger.openingBalance || 0 : -(ledger.openingBalance || 0);

  const sorted = [...vouchers].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return (a.dateTime || '').localeCompare(b.dateTime || '');
  });

  sorted.forEach((voucher) => {
    voucher.lines.forEach((line) => {
      if (line.ledgerId !== ledgerId) {
        return;
      }

      const debit = line.debit || 0;
      const credit = line.credit || 0;

      if (ledger.balanceType === 'debit') {
        running += debit - credit;
      } else {
        running += credit - debit;
      }

      rows.push({
        voucherId: voucher.id,
        date: voucher.date,
        dateTime: voucher.dateTime,
        type: voucher.type,
        narration: voucher.narration,
        debit,
        credit,
        balance: running,
      });
    });
  });

  return { ledger, rows, closingBalance: running };
}

export function voucherCashTotals(vouchers) {
  return vouchers.reduce(
    (summary, voucher) => {
      if (voucher.type === 'Receipt' || voucher.type === 'Sales') {
        summary.income += voucher.amount || 0;
      }
      if (voucher.type === 'Payment' || voucher.type === 'Purchase') {
        summary.expense += voucher.amount || 0;
      }
      return summary;
    },
    { income: 0, expense: 0 }
  );
}

export function getPartyOutstanding(ledgers, vouchers) {
  return getPartyLedgers(ledgers)
    .map((ledger) => ({
      ledger,
      balance: computeLedgerBalance(ledger.id, ledgers, vouchers),
    }))
    .filter((item) => Math.abs(item.balance) > 0.01)
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
}

export function getBusinessSuggestions(ledgers, vouchers) {
  const totals = voucherCashTotals(vouchers);
  const profit = totals.income - totals.expense;
  const outstanding = getPartyOutstanding(ledgers, vouchers);
  const suggestions = [];

  if (profit < 0) {
    suggestions.push('Cash outflow is higher than inflow. Review payments and collect pending customer dues.');
  } else if (totals.income > 0 && totals.expense / totals.income > 0.6) {
    suggestions.push('Payments are above 60% of receipts. Check material cost and pricing.');
  } else if (totals.income > 0) {
    suggestions.push('Cash position looks healthy. Keep recording every sale and payment.');
  } else {
    suggestions.push('Start with a Receipt or Sales voucher for income, and Payment for expenses.');
  }

  const receivables = outstanding.filter(
    (item) => item.ledger.group === 'Sundry Debtors' && item.balance > 0
  );
  const payables = outstanding.filter(
    (item) => item.ledger.group === 'Sundry Creditors' && item.balance > 0
  );

  if (receivables.length > 0) {
    const names = receivables.map((item) => item.ledger.name).join(', ');
    suggestions.push(`Collect from customers: ${names}.`);
  }

  if (payables.length > 0) {
    const names = payables.map((item) => item.ledger.name).join(', ');
    suggestions.push(`Pay suppliers: ${names}.`);
  }

  return suggestions;
}

export function ledgerName(ledgers, ledgerId) {
  return getLedgerById(ledgers, ledgerId)?.name || ledgerId;
}

export function voucherToCsvRows(vouchers, ledgers) {
  const header = ['Date', 'Type', 'Amount', 'Narration', 'Debit Ledger', 'Credit Ledger', 'Source'];
  const rows = [header];

  vouchers.forEach((voucher) => {
    const debitLine = voucher.lines.find((line) => line.debit > 0);
    const creditLine = voucher.lines.find((line) => line.credit > 0);
    rows.push([
      voucher.date,
      voucher.type,
      voucher.amount,
      voucher.narration,
      debitLine ? ledgerName(ledgers, debitLine.ledgerId) : '',
      creditLine ? ledgerName(ledgers, creditLine.ledgerId) : '',
      voucher.source || 'manual',
    ]);
  });

  return rows;
}

export function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function restoreBackupData(backup) {
  const data = backup?.data || backup;

  if (!data || !Array.isArray(data.businessVouchers) || !Array.isArray(data.businessLedgers)) {
    throw new Error('Invalid backup file: missing ledgers or vouchers');
  }

  writeSavedArray(LEDGERS_KEY, data.businessLedgers);
  writeSavedArray(VOUCHERS_KEY, data.businessVouchers);

  if (Array.isArray(data.businessLogs)) {
    writeSavedArray('businessLogs', data.businessLogs);
  }

  if (data.businessProfile) {
    writeScopedString('businessProfile', JSON.stringify(data.businessProfile));
  }

  if (Array.isArray(data.businessInventory)) {
    writeSavedArray('businessInventory', data.businessInventory);
  }

  if (Array.isArray(data.businessOrders)) {
    writeSavedArray('businessOrders', data.businessOrders);
  }

  return {
    ledgers: readLedgers(),
    vouchers: readVouchers(),
  };
}

export function migrateLogsToVouchers(logs, ledgers) {
  const existing = readVouchers();
  if (existing.length > 0 || logs.length === 0) {
    return existing;
  }

  const cashId = 'ledger-cash';
  const salesId = 'ledger-sales';
  const expenseId = 'ledger-misc-expense';
  const migrated = [];

  logs.forEach((log) => {
    const amount = Number(log.amount) || 0;
    if (amount <= 0) {
      return;
    }

    if (log.type === 'Income') {
      migrated.push(
        createVoucher({
          type: 'Receipt',
          amount,
          narration: log.text || 'Imported income',
          lines: buildReceiptLines(amount, cashId, salesId),
          source: 'migrated',
          date: log.date?.slice(0, 10),
        })
      );
    }

    if (log.type === 'Expense') {
      migrated.push(
        createVoucher({
          type: 'Payment',
          amount,
          narration: log.text || 'Imported expense',
          lines: buildPaymentLines(amount, expenseId, cashId),
          source: 'migrated',
          date: log.date?.slice(0, 10),
        })
      );
    }
  });

  if (migrated.length > 0) {
    writeSavedArray(VOUCHERS_KEY, [...migrated, ...existing]);
  }

  return readVouchers();
}

/**
 * Parses spoken text to extract accounting entities (amount, type, party, category, narration)
 */
export function parseVoiceCommand(text, existingParties = []) {
  const normalized = text.toLowerCase().trim();

  // 1. Detect Amount
  // Look for any sequence of digits, optionally separated by commas/dots
  const numbers = [];
  const rx = /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g;
  let match;
  while ((match = rx.exec(normalized)) !== null) {
    numbers.push(Number(match[0].replace(/,/g, '')));
  }
  const amount = numbers.length > 0 ? numbers[0] : 0;

  // 2. Detect Transaction Type
  // Receipt (received/income/payment from)
  // Payment (paid/spent/expense/kharch/payment to)
  // Sales (sold/sales/invoice/credit sale)
  // Purchase (purchased/purchase/bought/credit purchase)
  let type = 'Receipt'; // Default fallback
  if (normalized.includes('sold') || normalized.includes('sales') || normalized.includes('sale') || normalized.includes('invoice')) {
    type = 'Sales';
  } else if (normalized.includes('purchased') || normalized.includes('purchase') || normalized.includes('bought')) {
    type = 'Purchase';
  } else if (
    normalized.includes('paid') ||
    normalized.includes('spent') ||
    normalized.includes('expense') ||
    normalized.includes('kharch') ||
    normalized.includes('payment to') ||
    normalized.includes('pay to') ||
    normalized.includes('de rahe hain') ||
    normalized.includes('diya')
  ) {
    type = 'Payment';
  } else if (
    normalized.includes('received') ||
    normalized.includes('receipt') ||
    normalized.includes('income') ||
    normalized.includes('payment from') ||
    normalized.includes('mila') ||
    normalized.includes('mil gaya') ||
    normalized.includes('pay kiya')
  ) {
    type = 'Receipt';
  }

  // 3. Detect Party Name
  let partyName = '';
  let partyLedgerId = '';

  // First, check if any existing party is mentioned in the text
  const matchedParty = existingParties.find(p => normalized.includes(p.name.toLowerCase()));
  if (matchedParty) {
    partyName = matchedParty.name;
    partyLedgerId = matchedParty.id;
  } else {
    // If no existing party matches, try to extract name after indicators
    // Look for patterns like: "from [Name]", "to [Name]", "[Name] ko", "[Name] se"
    const fromMatch = normalized.match(/from\s+([a-z0-9\s]+?)(?:\s+worth|\s+of|\s+for|\s+on|\s+today|\s+dated|\s+\d|$)/i);
    const toMatch = normalized.match(/to\s+([a-z0-9\s]+?)(?:\s+worth|\s+of|\s+for|\s+on|\s+today|\s+dated|\s+\d|$)/i);
    const koMatch = normalized.match(/(?:^|\s)([a-z0-9\s]+?)\s+ko\b/i);
    const seMatch = normalized.match(/(?:^|\s)([a-z0-9\s]+?)\s+se\b/i);

    let candidate = '';
    if (fromMatch && fromMatch[1]) {
      candidate = fromMatch[1].trim();
    } else if (toMatch && toMatch[1]) {
      candidate = toMatch[1].trim();
    } else if (koMatch && koMatch[1]) {
      candidate = koMatch[1].trim();
    } else if (seMatch && seMatch[1]) {
      candidate = seMatch[1].trim();
    }

    if (candidate) {
      // Clean up common words
      candidate = candidate.replace(/\b(?:rs|rupees|rupaye|inr|worth|of|today|yesterday|date|for|on|worth|value|cash|bank)\b.*/gi, '').trim();
      // Remove starting prepositions if any
      candidate = candidate.replace(/^(?:received|paid|spent|purchased|sold|from|to|for|se|ko)\s+/i, '').trim();
      
      if (candidate.length > 2 && candidate.length < 30) {
        // Capitalize first letters
        partyName = candidate.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }

  // 4. Detect Category (Expense/Revenue Account)
  let category = '';
  const categoryKeywords = [
    { keywords: ['material', 'goods', 'stock', 'purchase', 'raw'], ledgerId: 'ledger-material', name: 'Material / Purchase' },
    { keywords: ['rent', 'office rent', 'shop rent', 'kiraya'], ledgerId: 'ledger-rent', name: 'Rent' },
    { keywords: ['courier', 'post', 'shipping', 'delivery', 'transport', 'speed post'], ledgerId: 'ledger-misc-expense', name: 'General Expense' },
    { keywords: ['tea', 'coffee', 'snacks', 'food', 'lunch', 'chai'], ledgerId: 'ledger-misc-expense', name: 'General Expense' },
    { keywords: ['salary', 'wage', 'staff', 'payment to helper'], ledgerId: 'ledger-misc-expense', name: 'General Expense' },
    { keywords: ['electricity', 'power', 'light', 'bill'], ledgerId: 'ledger-misc-expense', name: 'General Expense' }
  ];

  for (const item of categoryKeywords) {
    if (item.keywords.some(kw => normalized.includes(kw))) {
      category = item.name;
      break;
    }
  }

  // Fallback category mapping based on transaction type
  if (!category) {
    if (type === 'Payment' || type === 'Purchase') {
      category = 'General Expense';
    } else {
      category = 'Sales';
    }
  }

  return {
    amount,
    type,
    partyName,
    partyLedgerId,
    category,
    narration: text
  };
}

/**
 * Computes daily and monthly stats with Month-over-Month (MoM) growth rates
 */
export function getDailyAndMonthlyStats(vouchers, ledgers) {
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM

  // Compute previous month YYYY-MM
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const prevMonthStr = d.toLocaleDateString('en-CA').slice(0, 7);

  let todaySales = 0;
  let todayExpenses = 0;
  let monthlySales = 0;
  let monthlyExpenses = 0;
  let prevMonthlySales = 0;
  let prevMonthlyExpenses = 0;

  vouchers.forEach((vch) => {
    const amount = Number(vch.amount) || 0;
    const vchMonth = (vch.date || '').slice(0, 7);

    // Sales/Receipts count under sales metrics, Payment/Purchases count under expense metrics
    const isSalesType = vch.type === 'Receipt' || vch.type === 'Sales';
    const isExpenseType = vch.type === 'Payment' || vch.type === 'Purchase';

    if (vch.date === todayStr) {
      if (isSalesType) todaySales += amount;
      if (isExpenseType) todayExpenses += amount;
    }

    if (vchMonth === currentMonthStr) {
      if (isSalesType) monthlySales += amount;
      if (isExpenseType) monthlyExpenses += amount;
    }

    if (vchMonth === prevMonthStr) {
      if (isSalesType) prevMonthlySales += amount;
      if (isExpenseType) prevMonthlyExpenses += amount;
    }
  });

  const calculateGrowth = (current, previous) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
  };

  const salesGrowth = calculateGrowth(monthlySales, prevMonthlySales);
  const expenseGrowth = calculateGrowth(monthlyExpenses, prevMonthlyExpenses);

  return {
    todaySales,
    todayExpenses,
    monthlySales,
    monthlyExpenses,
    salesGrowth,
    expenseGrowth,
    prevMonthlySales,
    prevMonthlyExpenses,
  };
}

/**
 * Computes full performance metrics and details for each party (khata)
 */
export function getPartySummary(ledgers, vouchers) {
  const partyLedgers = getPartyLedgers(ledgers);

  return partyLedgers.map((ledger) => {
    let totalSales = 0;
    let totalPayments = 0;
    let lastDate = '—';

    vouchers.forEach((vch) => {
      let isPartyInvolved = false;
      vch.lines.forEach((line) => {
        if (line.ledgerId === ledger.id) {
          isPartyInvolved = true;
          if (ledger.group === 'Sundry Debtors') {
            // Customer ledger: debits are invoice sales, credits are cash payments received
            totalSales += line.debit || 0;
            totalPayments += line.credit || 0;
          } else {
            // Supplier ledger: credits are invoice purchases, debits are payments made
            totalSales += line.credit || 0; // represent purchases from them
            totalPayments += line.debit || 0; // represent payments made to them
          }
        }
      });

      if (isPartyInvolved) {
        if (lastDate === '—' || vch.date > lastDate) {
          lastDate = vch.date;
        }
      }
    });

    const outstandingAmount = computeLedgerBalance(ledger.id, ledgers, vouchers);

    return {
      id: ledger.id,
      name: ledger.name,
      group: ledger.group,
      totalSales,
      totalPayments,
      outstandingAmount,
      lastTransactionDate: lastDate,
    };
  });
}

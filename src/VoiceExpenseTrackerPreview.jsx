import { useEffect, useMemo, useState } from 'react';
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
} from './accounting';

const STORAGE_KEY = 'businessLogs';
const PROFILE_KEY = 'businessProfile';
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
};
const SUPPORT_EMAIL = 'trinetr1901@gmail.com';
const SUPPORT_PHONE = '+918488943771';

const CASH_LEDGER_ID = 'ledger-cash';
const SALES_LEDGER_ID = 'ledger-sales';
const MATERIAL_LEDGER_ID = 'ledger-material';
const DEFAULT_EXPENSE_LEDGER_ID = 'ledger-misc-expense';

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function readSavedLogs() {
  return readSavedArray(STORAGE_KEY);
}

function readProfile() {
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') };
  } catch {
    return DEFAULT_PROFILE;
  }
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
  const expression = input.replace(/,/g, '').trim();
  if (!/^[\d+\-*/().\s]+$/.test(expression)) {
    return null;
  }

  try {
    const value = Function(`"use strict"; return (${expression});`)();
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export default function VoiceExpenseTrackerPreview() {
  const [transcript, setTranscript] = useState('Click start and speak your expense...');
  const [status, setStatus] = useState('Idle');
  const [language, setLanguage] = useState('en-US');
  const [logs, setLogs] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
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

  const [statementLedgerId, setStatementLedgerId] = useState('');
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyType, setNewPartyType] = useState('customer');
  const [dayBookFilter, setDayBookFilter] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('Ask about profit, loss, cash balance, party balance, or type a calculation.');

  useEffect(() => {
    if (!getSpeechRecognition()) {
      setBrowserSupported(false);
    }

    const initialLedgers = ensureDefaultLedgers();
    const initialLogs = readSavedLogs();
    const initialVouchers = migrateLogsToVouchers(initialLogs, initialLedgers);

    setLedgers(initialLedgers);
    setVouchers(initialVouchers);
    setLogs(initialLogs);
    setProfile(readProfile());

    const parties = getPartyLedgers(initialLedgers);
    if (parties.length > 0) {
      setStatementLedgerId(parties[0].id);
      setVoucherPartyId(parties[0].id);
      setUseSalesInsteadOfParty(false);
    }
  }, []);

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

  const cashBalance = useMemo(
    () => computeLedgerBalance(CASH_LEDGER_ID, ledgers, vouchers),
    [ledgers, vouchers]
  );

  const chartData = useMemo(() => {
    const maxValue = Math.max(totals.income, totals.expense, 1);
    return [
      {
        label: 'Receipts',
        amount: totals.income,
        colorClass: 'income',
        width: Math.round((totals.income / maxValue) * 100),
      },
      {
        label: 'Payments',
        amount: totals.expense,
        colorClass: 'expense',
        width: Math.round((totals.expense / maxValue) * 100),
      },
    ];
  }, [totals]);

  const statement = useMemo(
    () => getLedgerStatement(statementLedgerId, ledgers, vouchers),
    [statementLedgerId, ledgers, vouchers]
  );

  const partyOutstanding = useMemo(() => getPartyOutstanding(ledgers, vouchers), [ledgers, vouchers]);
  const suggestions = useMemo(() => getBusinessSuggestions(ledgers, vouchers), [ledgers, vouchers]);
  const netProfit = totals.income - totals.expense;

  const aiInsights = useMemo(() => {
    const totalDebits = vouchers.reduce((total, voucher) => total + voucher.lines.reduce((sum, line) => sum + (line.debit || 0), 0), 0);
    const totalCredits = vouchers.reduce(
      (total, voucher) => total + voucher.lines.reduce((sum, line) => sum + (line.credit || 0), 0),
      0
    );
    const unbalancedVouchers = vouchers.filter((voucher) => {
      const debit = voucher.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const credit = voucher.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
      return Math.abs(debit - credit) > 0.01;
    });
    const receivables = partyOutstanding.filter(
      ({ ledger, balance }) => ledger.group === 'Sundry Debtors' && balance > 0
    );
    const payables = partyOutstanding.filter(
      ({ ledger, balance }) => ledger.group === 'Sundry Creditors' && balance > 0
    );
    const receivableTotal = receivables.reduce((sum, item) => sum + item.balance, 0);
    const payableTotal = payables.reduce((sum, item) => sum + item.balance, 0);
    const expenseRatio = totals.income > 0 ? Math.round((totals.expense / totals.income) * 100) : 0;
    const profitMargin = totals.income > 0 ? Math.round((netProfit / totals.income) * 100) : 0;
    let score = 70;

    if (netProfit > 0) score += 12;
    if (netProfit < 0) score -= 22;
    if (cashBalance < 0) score -= 18;
    if (expenseRatio > 75) score -= 15;
    if (expenseRatio < 55 && totals.income > 0) score += 8;
    if (receivableTotal > totals.income * 0.35 && totals.income > 0) score -= 10;
    if (unbalancedVouchers.length > 0) score -= 20;
    score = Math.max(0, Math.min(100, score));

    const pros = [];
    const cons = [];

    if (netProfit >= 0) {
      pros.push(`Profit side positive hai: ${formatCurrency(netProfit)} net balance.`);
    } else {
      cons.push(`Loss chal raha hai: ${formatCurrency(Math.abs(netProfit))} shortfall.`);
    }
    if (cashBalance >= 0) {
      pros.push(`Cash/Bank balance available hai: ${formatCurrency(cashBalance)}.`);
    } else {
      cons.push(`Cash/Bank negative dikh raha hai: ${formatCurrency(Math.abs(cashBalance))}.`);
    }
    if (receivableTotal > 0) {
      cons.push(`Customer se collect karna baki hai: ${formatCurrency(receivableTotal)}.`);
    } else {
      pros.push('Receivable pressure low hai.');
    }
    if (expenseRatio > 70) {
      cons.push(`Expense ratio high hai: ${expenseRatio}%. Cost control check karo.`);
    } else if (totals.income > 0) {
      pros.push(`Expense ratio manageable hai: ${expenseRatio}%.`);
    }
    if (unbalancedVouchers.length > 0) {
      cons.push(`${unbalancedVouchers.length} voucher debit-credit mismatch me hai.`);
    } else {
      pros.push('Balance sheet checker: sab vouchers debit-credit balanced hain.');
    }

    return {
      score,
      health: getBusinessHealthLabel(score),
      totalDebits,
      totalCredits,
      unbalancedVouchers,
      receivableTotal,
      payableTotal,
      expenseRatio,
      profitMargin,
      pros,
      cons,
    };
  }, [cashBalance, netProfit, partyOutstanding, totals.expense, totals.income, vouchers]);

  const filteredVouchers = useMemo(() => {
    if (!dayBookFilter) {
      return vouchers;
    }
    return vouchers.filter((voucher) => voucher.date === dayBookFilter);
  }, [vouchers, dayBookFilter]);

  const refreshVouchers = () => setVouchers(readVouchers());

  const persistVoucher = (voucher) => {
    saveVoucher(voucher);
    refreshVouchers();
  };

  const saveReceiptOrPayment = ({
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

    persistVoucher(voucher);
    return voucher;
  };

  const saveVoucherEntry = (event) => {
    event.preventDefault();

    const amount = Number(voucherAmount) || 0;
    const narration = voucherNarration.trim();

    if (amount <= 0) {
      setStatus('Enter a voucher amount greater than zero');
      return;
    }

    if (!narration) {
      setStatus('Enter narration for this voucher');
      return;
    }

    try {
      if (voucherType === 'Receipt') {
        const creditLedgerId = useSalesInsteadOfParty
          ? SALES_LEDGER_ID
          : voucherPartyId || SALES_LEDGER_ID;

        saveReceiptOrPayment({
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

        saveReceiptOrPayment({
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
        persistVoucher(voucher);
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
        persistVoucher(voucher);
      }

      setStatus(`${voucherType} voucher saved`);
      setVoucherAmount('');
      setVoucherNarration('');
    } catch (error) {
      setStatus(error.message);
    }
  };

  const saveVoiceAsVoucher = (voiceText, detectedType, amount) => {
    if (amount <= 0) {
      saveLog({
        type: detectedType,
        text: voiceText,
        amount: 0,
        date: new Date().toLocaleString(),
      });
      setStatus('Voice note saved (no amount detected)');
      return;
    }

    if (detectedType === 'Income') {
      saveReceiptOrPayment({
        type: 'Receipt',
        amount,
        narration: voiceText,
        cashLedgerId: CASH_LEDGER_ID,
        counterLedgerId: SALES_LEDGER_ID,
        source: 'voice',
      });
      setStatus('Receipt voucher saved from voice');
      return;
    }

    if (detectedType === 'Expense') {
      saveReceiptOrPayment({
        type: 'Payment',
        amount,
        narration: voiceText,
        cashLedgerId: CASH_LEDGER_ID,
        counterLedgerId: DEFAULT_EXPENSE_LEDGER_ID,
        source: 'voice',
      });
      setStatus('Payment voucher saved from voice');
      return;
    }

    saveLog({
      type: detectedType,
      text: voiceText,
      amount: 0,
      date: new Date().toLocaleString(),
    });
    setStatus('Work note saved');
  };

  const startVoiceRecognition = async () => {
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
          alert('Please allow microphone access in your browser settings and refresh the page.');
          return;
        }
      }

      await navigator.mediaDevices.getUserMedia({ audio: true });

      const recognition = new SpeechRecognition();

      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setStatus('Listening...');
      recognition.start();

      recognition.onresult = (event) => {
        const voiceText = event.results[0][0].transcript;
        const detectedType = detectType(voiceText);
        const amount = detectAmount(voiceText, detectedType);

        setTranscript(voiceText);
        saveVoiceAsVoucher(voiceText, detectedType, amount);
      };

      recognition.onerror = (event) => {
        switch (event.error) {
          case 'not-allowed':
            setStatus('Microphone permission denied');
            break;
          case 'no-speech':
            setStatus('No voice detected');
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
      console.error(error);
      setStatus('Please allow microphone permission and use Google Chrome');
    }
  };

  const saveLog = (log) => {
    const updatedLogs = [log, ...readSavedLogs()];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    setLogs(updatedLogs);
  };

  const deleteLog = (index) => {
    const updatedLogs = readSavedLogs().filter((_, logIndex) => logIndex !== index);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    setLogs(updatedLogs);
    setStatus('Entry deleted');
  };

  const removeVoucher = (voucherId) => {
    deleteVoucher(voucherId);
    refreshVouchers();
    setStatus('Voucher deleted');
  };

  const saveManualEntry = (event) => {
    event.preventDefault();

    const text = manualText.trim();
    const amount = Number(manualAmount) || 0;

    if (!text) {
      setStatus('Please write entry details before saving');
      return;
    }

    if (manualType === 'Income' && amount > 0) {
      saveReceiptOrPayment({
        type: 'Receipt',
        amount,
        narration: text,
        cashLedgerId: CASH_LEDGER_ID,
        counterLedgerId: voucherPartyId && !useSalesInsteadOfParty ? voucherPartyId : SALES_LEDGER_ID,
        source: 'manual',
      });
      setTranscript(text);
      setStatus('Receipt voucher saved');
      setManualText('');
      setManualAmount('');
      return;
    }

    if (manualType === 'Expense' && amount > 0) {
      saveReceiptOrPayment({
        type: 'Payment',
        amount,
        narration: text,
        cashLedgerId: CASH_LEDGER_ID,
        counterLedgerId: voucherExpenseId,
        source: 'manual',
      });
      setTranscript(text);
      setStatus('Payment voucher saved');
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

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VOUCHERS_KEY);
    localStorage.removeItem(LEDGERS_KEY);
    const freshLedgers = ensureDefaultLedgers();
    setLogs([]);
    setLedgers(freshLedgers);
    setVouchers([]);
    setStatus('All accounting data cleared');
  };

  const saveBusinessProfile = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextProfile = {
      ...profile,
      name: formData.get('profileName')?.trim() || DEFAULT_PROFILE.name,
      tagline: formData.get('profileTagline')?.trim() || DEFAULT_PROFILE.tagline,
      owner: formData.get('profileOwner')?.trim() || DEFAULT_PROFILE.owner,
      email: formData.get('profileEmail')?.trim() || DEFAULT_PROFILE.email,
      phone: formData.get('profilePhone')?.trim() || DEFAULT_PROFILE.phone,
      address: formData.get('profileAddress')?.trim() || '',
    };

    const uploadedLogo = formData.get('profileLogo');
    if (uploadedLogo?.size) {
      nextProfile.logo = await fileToDataUrl(uploadedLogo);
    }

    localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
    setProfile(nextProfile);
    setStatus('Business profile saved');
  };

  const resetBusinessProfile = () => {
    localStorage.removeItem(PROFILE_KEY);
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
    } catch (error) {
      setStatus(error.message || 'Could not restore backup');
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
        type: 'Browser localStorage',
        origin: window.location.origin,
        deviceScope: 'This browser on this device',
      },
      data: {
        businessLogs: readSavedArray(STORAGE_KEY),
        businessLedgers: readLedgers(),
        businessVouchers: readVouchers(),
        businessInventory: readSavedArray(INVENTORY_KEY),
        businessOrders: readSavedArray(ORDERS_KEY),
        businessProfile: readProfile(),
        voiceLowStockAlertsEnabled: localStorage.getItem(VOICE_ALERTS_KEY) !== 'false',
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
    const receiptText = buildVoucherReceiptText(voucher)
      .split('\n')
      .map((line) => `<p>${line.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[char])}</p>`)
      .join('');
    const receiptWindow = window.open('', '_blank', 'width=720,height=860');
    if (!receiptWindow) {
      setStatus('Allow popups to print receipt/PDF');
      return;
    }
    receiptWindow.document.write(`
      <html>
        <head>
          <title>${voucher.type} Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
            .receipt { border: 1px solid #d1d5db; border-radius: 12px; padding: 24px; }
            h1 { margin: 0 0 16px; font-size: 24px; }
            p { margin: 8px 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <h1>${profile.name}</h1>
            ${receiptText}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    receiptWindow.document.close();
  };

  const answerAiQuestion = (event) => {
    event.preventDefault();
    const question = aiQuestion.trim();
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

    if (lowerQuestion.includes('profit') || lowerQuestion.includes('loss') || lowerQuestion.includes('nuksan')) {
      setAiAnswer(
        netProfit >= 0
          ? `Business abhi profit side par hai. Net profit/cash surplus: ${formatCurrency(netProfit)}. Margin approx ${aiInsights.profitMargin}%.`
          : `Business abhi loss side par hai. Net loss/shortfall: ${formatCurrency(Math.abs(netProfit))}. Expense ratio ${aiInsights.expenseRatio}% hai.`
      );
      return;
    }

    if (lowerQuestion.includes('balance') || lowerQuestion.includes('sheet') || lowerQuestion.includes('check')) {
      setAiAnswer(
        aiInsights.unbalancedVouchers.length === 0
          ? `Balance sheet checker OK: debit ${formatCurrency(aiInsights.totalDebits)} aur credit ${formatCurrency(aiInsights.totalCredits)} match kar rahe hain.`
          : `Warning: ${aiInsights.unbalancedVouchers.length} voucher mismatch me hai. Debit ${formatCurrency(aiInsights.totalDebits)}, credit ${formatCurrency(aiInsights.totalCredits)}.`
      );
      return;
    }

    if (lowerQuestion.includes('cash')) {
      setAiAnswer(`Current cash/bank balance: ${formatCurrency(cashBalance)}.`);
      return;
    }

    if (lowerQuestion.includes('receive') || lowerQuestion.includes('customer') || lowerQuestion.includes('party')) {
      setAiAnswer(`Customer receivable total: ${formatCurrency(aiInsights.receivableTotal)}. Supplier payable total: ${formatCurrency(aiInsights.payableTotal)}.`);
      return;
    }

    setAiAnswer(
      `AI summary: Health ${aiInsights.health} (${aiInsights.score}/100), net ${formatCurrency(netProfit)}, cash ${formatCurrency(cashBalance)}, expense ratio ${aiInsights.expenseRatio}%.`
    );
  };

  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label="Main menu">
        <div className="sidebar-brand">
          <img className="sidebar-logo" src={profile.logo} alt="" />
          <div>
            <strong>{profile.name}</strong>
            <span>Business Console</span>
          </div>
        </div>
        <nav className="side-nav">
          <a href="#dashboard">Dashboard</a>
          <a href="#ai-assistant">AI Assistant</a>
          <a href="#voucher-entry">Voucher Entry</a>
          <a href="#reports">Reports</a>
          <a href="#day-book">Day Book</a>
          <a href="#party-statement">Party Statement</a>
          <a href="#voice-entry">Voice Entry</a>
          <a href="#profile-settings">Profile</a>
          <a href="#app-settings">Settings</a>
          <a href="#support">Help & Support</a>
        </nav>
        <div className="sidebar-support">
          <span>Support</span>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          <a href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</a>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Professional business tracker</span>
            <strong>{status}</strong>
          </div>
          <div className="topbar-actions">
            <a className="topbar-link" href="#profile-settings">Profile</a>
            <a className="topbar-link" href="#app-settings">Settings</a>
            <a className="topbar-link primary" href="#support">Support</a>
          </div>
        </header>

        <main className="page-shell">
      <section className="hero-panel" id="dashboard">
        <div className="brand-header">
          <img className="brand-logo" src={profile.logo} alt="Business logo" />
          <div>
            <h1>{profile.name}</h1>
            <p>{profile.tagline}</p>
            <div className="profile-meta">
              <span>{profile.owner}</span>
              <span>{profile.email}</span>
              <span>{profile.phone}</span>
            </div>
          </div>
        </div>

        {!browserSupported && (
          <div className="notice error">
            Your browser does not support voice recognition. Please use Google Chrome.
          </div>
        )}

        <div className="stats-grid">
          <article className="stat-card income">
            <h2>Cash Receipts</h2>
            <p>{formatCurrency(totals.income)}</p>
          </article>
          <article className="stat-card expense">
            <h2>Cash Payments</h2>
            <p>{formatCurrency(totals.expense)}</p>
          </article>
          <article className="stat-card profit">
            <h2>Net (Receipts − Payments)</h2>
            <p>{formatCurrency(netProfit)}</p>
          </article>
        </div>

        <div className="stats-grid secondary-stats">
          <article className="stat-card profit">
            <h2>Cash in Hand</h2>
            <p>{formatCurrency(cashBalance)}</p>
          </article>
          <article className="stat-card income">
            <h2>Parties with balance</h2>
            <p>{partyOutstanding.length}</p>
          </article>
          <article className="stat-card expense">
            <h2>Total vouchers</h2>
            <p>{vouchers.length}</p>
          </article>
        </div>

        <section className="chart-panel">
          <div className="chart-header">
            <h2>Receipts vs Payments</h2>
            <p>Tally-style cash book summary from balanced vouchers.</p>
          </div>
          <div className="bar-chart">
            {chartData.map((item) => (
              <div className="bar-row" key={item.label}>
                <div className="bar-label">{item.label}</div>
                <div className="bar-track">
                  <div className={`bar-fill ${item.colorClass}`} style={{ width: `${item.width}%` }} />
                </div>
                <div className="bar-value">{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="panel ai-panel" id="ai-assistant">
        <div className="section-header">
          <div>
            <span className="eyebrow">AI Business Assistant</span>
            <h2>Owner ka smart business checker</h2>
            <p className="panel-hint">
              Local database se profit/loss, balance sheet, party outstanding aur business pros-cons calculate karta hai.
            </p>
          </div>
          <span>{aiInsights.health} · {aiInsights.score}/100</span>
        </div>
        <div className="ai-grid">
          <article className="ai-score-card">
            <span>Business Health</span>
            <strong>{aiInsights.health}</strong>
            <p>Profit margin {aiInsights.profitMargin}% · Expense ratio {aiInsights.expenseRatio}%</p>
          </article>
          <article className="summary-card">
            <span>AI Profit / Loss</span>
            <strong>{formatCurrency(netProfit)}</strong>
          </article>
          <article className="summary-card">
            <span>Receivable</span>
            <strong>{formatCurrency(aiInsights.receivableTotal)}</strong>
          </article>
          <article className="summary-card">
            <span>Payable</span>
            <strong>{formatCurrency(aiInsights.payableTotal)}</strong>
          </article>
        </div>
        <div className="ai-checker-grid">
          <div className="ai-list good">
            <h3>Pros</h3>
            {aiInsights.pros.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
          <div className="ai-list watch">
            <h3>Cons / Warning</h3>
            {aiInsights.cons.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
        <div className="balance-checker">
          <div>
            <span>Debit Total</span>
            <strong>{formatCurrency(aiInsights.totalDebits)}</strong>
          </div>
          <div>
            <span>Credit Total</span>
            <strong>{formatCurrency(aiInsights.totalCredits)}</strong>
          </div>
          <div>
            <span>Mismatch</span>
            <strong>{aiInsights.unbalancedVouchers.length}</strong>
          </div>
        </div>
        <form className="ai-calculator" onSubmit={answerAiQuestion}>
          <label className="field-label" htmlFor="ai-question">
            AI Calculator / Question
          </label>
          <div className="ai-input-row">
            <input
              id="ai-question"
              value={aiQuestion}
              onChange={(event) => setAiQuestion(event.target.value)}
              placeholder="Example: profit kitna hai? / balance check / 2500+1800-400"
            />
            <button className="manual-button" type="submit">
              Ask AI
            </button>
          </div>
          <div className="ai-answer">{aiAnswer}</div>
        </form>
      </section>

      <section className="content-grid" id="voucher-entry">
        <article className="panel">
          <h2>Voucher Entry</h2>
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
                <>
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
                </>
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
            <button className="manual-button" type="submit">
              Save {voucherType} Voucher
            </button>
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

      <section className="panel" id="reports">
        <h2>Business Reports</h2>
        <div className="summary-grid report-summary">
          <div className="summary-card">
            <span>Total receipts + sales</span>
            <strong>{formatCurrency(totals.income)}</strong>
          </div>
          <div className="summary-card">
            <span>Total payments + purchases</span>
            <strong>{formatCurrency(totals.expense)}</strong>
          </div>
          <div className="summary-card">
            <span>Net</span>
            <strong>{formatCurrency(netProfit)}</strong>
          </div>
          <div className="summary-card">
            <span>Cash in hand</span>
            <strong>{formatCurrency(cashBalance)}</strong>
          </div>
        </div>
        <div className="inline-actions">
          <button className="secondary-button" type="button" onClick={exportVouchersCsv}>
            Export Day Book CSV
          </button>
          <button className="warning-button" type="button" onClick={printReport}>
            Print Report
          </button>
        </div>
        <div className="suggestion-list">
          {suggestions.map((text) => (
            <div key={text}>{text}</div>
          ))}
        </div>
        {partyOutstanding.length > 0 && (
          <>
            <h3 className="subsection-title">Party outstanding (Khata)</h3>
            <div className="compact-list">
              {partyOutstanding.map(({ ledger, balance }) => (
                <article className="compact-item" key={ledger.id}>
                  <div>
                    <strong>{ledger.name}</strong>
                    <p>{ledger.group}</p>
                  </div>
                  <strong>{formatPartyBalance(ledger, balance)}</strong>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel" id="day-book">
        <label className="field-label" htmlFor="daybook-filter">
          Filter day book by date (optional)
        </label>
        <input
          id="daybook-filter"
          type="date"
          value={dayBookFilter}
          onChange={(event) => setDayBookFilter(event.target.value)}
        />
        {dayBookFilter && (
          <button className="delete-entry-button" type="button" onClick={() => setDayBookFilter('')}>
            Clear filter
          </button>
        )}
        <div className="section-header">
          <h2>Day Book</h2>
          <span>{filteredVouchers.length} shown</span>
        </div>
        <div className="activity-list">
          {filteredVouchers.length === 0 ? (
            <div className="empty-state">No vouchers for this filter.</div>
          ) : (
            filteredVouchers.map((voucher) => (
              <article className="activity-item" key={voucher.id}>
                <div>
                  <p className={`activity-type voucher-${voucher.type.toLowerCase()}`}>{voucher.type}</p>
                  <p>{voucher.narration}</p>
                  <p className="voucher-meta">
                    {voucher.date} · {counterLabel(voucher)} · {voucher.source}
                  </p>
                </div>
                <strong>{formatCurrency(voucher.amount)}</strong>
                <div className="voucher-actions">
                  <button className="share-entry-button" type="button" onClick={() => shareVoucher(voucher)}>
                    Share
                  </button>
                  <button className="share-entry-button" type="button" onClick={() => shareVoucherToWhatsApp(voucher)}>
                    WhatsApp
                  </button>
                  <button className="share-entry-button" type="button" onClick={() => shareVoucherToFacebook(voucher)}>
                    Facebook
                  </button>
                  <button className="share-entry-button" type="button" onClick={() => printVoucherReceipt(voucher)}>
                    PDF
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

      <section className="panel" id="party-statement">
        <h2>Party Statement (Khata)</h2>
        {partyLedgers.length === 0 ? (
          <p className="panel-hint">Add a customer or supplier party to see their running balance.</p>
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
                    <th>Debit</th>
                    <th>Credit</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        No entries for this party yet.
                      </td>
                    </tr>
                  ) : (
                    statement.rows.map((row) => (
                      <tr key={`${row.voucherId}-${row.dateTime}-${row.debit}-${row.credit}`}>
                        <td>{row.date}</td>
                        <td>{row.type}</td>
                        <td>{row.narration}</td>
                        <td>{row.debit ? formatCurrency(row.debit) : '—'}</td>
                        <td>{row.credit ? formatCurrency(row.credit) : '—'}</td>
                        <td>{formatCurrency(row.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="content-grid" id="voice-entry">
        <article className="panel">
          <h2>Voice Entry</h2>
          <div className="terminal">
            <p>{status}</p>
            <p>{transcript}</p>
          </div>
          <label className="field-label" htmlFor="voice-language">
            Select Voice Language
          </label>
          <select
            id="voice-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="en-US">English</option>
            <option value="hi-IN">Hindi</option>
            <option value="gu-IN">Gujarati</option>
          </select>
          <button className="primary-button" type="button" onClick={startVoiceRecognition}>
            Start Voice Tracking
          </button>
          <button className="danger-button" type="button" onClick={clearAllData}>
            Clear All Data
          </button>
        </article>

        <article className="panel">
          <h2>Quick Manual Entry</h2>
          <form onSubmit={saveManualEntry}>
            <div className="form-grid">
              <div>
                <label className="field-label" htmlFor="manual-type">
                  Entry Type
                </label>
                <select
                  id="manual-type"
                  value={manualType}
                  onChange={(event) => setManualType(event.target.value)}
                >
                  <option value="Expense">Payment (expense)</option>
                  <option value="Income">Receipt (income)</option>
                  <option value="Routine Work">Routine Work</option>
                  <option value="Daily Note">Daily Note</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="manual-amount">
                  Amount
                </label>
                <input
                  id="manual-amount"
                  min="0"
                  step="1"
                  type="number"
                  value={manualAmount}
                  onChange={(event) => setManualAmount(event.target.value)}
                  placeholder="Example: 500"
                />
              </div>
              <div className="wide-field">
                <label className="field-label" htmlFor="manual-text">
                  Details
                </label>
                <textarea
                  id="manual-text"
                  value={manualText}
                  onChange={(event) => setManualText(event.target.value)}
                  placeholder="Income/expense creates a voucher; notes stay as text only"
                />
              </div>
            </div>
            <button className="manual-button" type="submit">
              Save Entry
            </button>
          </form>
          <div className="quick-actions">
            <button
              type="button"
              onClick={() => fillManualTemplate('Expense', 500, 'Spent 500 rupees on material')}
            >
              Payment ₹500
            </button>
            <button
              type="button"
              onClick={() => fillManualTemplate('Income', 2500, 'Received 2500 rupees from customer')}
            >
              Receipt ₹2500
            </button>
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Notes (non-voucher)</h2>
          <span>{logs.length} Notes</span>
        </div>
        <div className="activity-list">
          {logs.length === 0 ? (
            <div className="empty-state">No text notes. Routine work and daily notes appear here.</div>
          ) : (
            logs.map((log, index) => (
              <article className="activity-item" key={`${log.date}-${index}`}>
                <div>
                  <p className="activity-type">{log.type}</p>
                  <p>{log.text}</p>
                  <time>{log.date}</time>
                </div>
                <button className="delete-entry-button" type="button" onClick={() => deleteLog(index)}>
                  Delete
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel profile-editor" id="profile-settings">
        <div className="section-header">
          <div>
            <h2>Business Profile</h2>
            <p className="panel-hint">Edit the identity and contact details shown across the app.</p>
          </div>
          <span>Profile</span>
        </div>
        <form onSubmit={saveBusinessProfile}>
          <div className="profile-editor-grid">
            <div className="profile-logo-card">
              <img className="profile-logo-preview" src={profile.logo} alt="Business logo preview" />
              <label className="field-label" htmlFor="profile-logo">
                Upload Logo
              </label>
              <input accept="image/*" id="profile-logo" name="profileLogo" type="file" />
            </div>
            <div className="form-grid">
              <div>
                <label className="field-label" htmlFor="profile-name">
                  Shop / Company Name
                </label>
                <input id="profile-name" name="profileName" defaultValue={profile.name} />
              </div>
              <div>
                <label className="field-label" htmlFor="profile-owner">
                  Owner / Manager
                </label>
                <input id="profile-owner" name="profileOwner" defaultValue={profile.owner} />
              </div>
              <div className="wide-field">
                <label className="field-label" htmlFor="profile-tagline">
                  Short Description
                </label>
                <input id="profile-tagline" name="profileTagline" defaultValue={profile.tagline} />
              </div>
              <div>
                <label className="field-label" htmlFor="profile-email">
                  Email
                </label>
                <input id="profile-email" name="profileEmail" type="email" defaultValue={profile.email} />
              </div>
              <div>
                <label className="field-label" htmlFor="profile-phone">
                  Phone
                </label>
                <input id="profile-phone" name="profilePhone" defaultValue={profile.phone} />
              </div>
              <div className="wide-field">
                <label className="field-label" htmlFor="profile-address">
                  Business Address
                </label>
                <textarea id="profile-address" name="profileAddress" defaultValue={profile.address} />
              </div>
            </div>
          </div>
          <div className="inline-actions">
            <button className="manual-button" type="submit">
              Save Business Profile
            </button>
            <button className="warning-button" type="button" onClick={resetBusinessProfile}>
              Reset Default
            </button>
          </div>
        </form>
      </section>

      <section className="panel settings-panel" id="app-settings">
        <div className="section-header">
          <div>
            <h2>Settings</h2>
            <p className="panel-hint">Manage language, data storage, backups, and report output.</p>
          </div>
          <span>Admin</span>
        </div>
        <div className="settings-grid">
          <article className="settings-card">
            <h3>Voice Language</h3>
            <p>Current input language: {language}</p>
            <a href="#voice-entry">Change voice entry language</a>
          </article>
          <article className="settings-card">
            <h3>Data Safety</h3>
            <p>Download a JSON backup before clearing browser storage or changing devices.</p>
            <button className="secondary-button compact-button" type="button" onClick={downloadFullBackup}>
              Download Backup
            </button>
          </article>
          <article className="settings-card">
            <h3>Reports</h3>
            <p>Export the day book for Excel or print a summary for review.</p>
            <button className="warning-button compact-button" type="button" onClick={printReport}>
              Print Report
            </button>
          </article>
        </div>
      </section>

      <section className="panel support-panel" id="support">
        <div>
          <span className="eyebrow">Help & Contact Support</span>
          <h2>Need help with your business tracker?</h2>
          <p>
            Contact support for setup help, backup guidance, deployment issues, or workflow customization.
          </p>
        </div>
        <div className="support-actions">
          <a className="support-card" href={`mailto:${SUPPORT_EMAIL}`}>
            <span>Email Support</span>
            <strong>{SUPPORT_EMAIL}</strong>
          </a>
          <a className="support-card" href={`tel:${SUPPORT_PHONE}`}>
            <span>Call / WhatsApp</span>
            <strong>{SUPPORT_PHONE}</strong>
          </a>
        </div>
      </section>

      <section className="panel">
        <h2>Backup / Restore</h2>
        <div className="inline-actions">
          <button className="secondary-button" type="button" onClick={downloadFullBackup}>
            Download Full Backup
          </button>
          <label className="warning-button restore-label">
            Restore Backup
            <input accept="application/json,.json" hidden type="file" onChange={restoreFullBackup} />
          </label>
        </div>
        <div className="storage-box">
          <strong>Data Storage Location</strong>
          <p>
            Saved in this browser via localStorage: businessLedgers, businessVouchers, businessLogs,
            businessProfile.
          </p>
        </div>
      </section>
        </main>
      </div>
    </div>
  );
}

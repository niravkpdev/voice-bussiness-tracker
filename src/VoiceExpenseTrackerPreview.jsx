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
};

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

  const filteredVouchers = useMemo(() => {
    if (!dayBookFilter) {
      return vouchers;
    }
    return vouchers.filter((voucher) => voucher.date === dayBookFilter);
  }, [vouchers, dayBookFilter]);

  const netProfit = totals.income - totals.expense;

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

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="brand-header">
          <img className="brand-logo" src={profile.logo} alt="Business logo" />
          <div>
            <h1>{profile.name}</h1>
            <p>{profile.tagline}</p>
          </div>
        </div>

        <details className="profile-panel">
          <summary>Business Profile</summary>
          <form onSubmit={saveBusinessProfile}>
            <div className="form-grid">
              <div>
                <label className="field-label" htmlFor="profile-name">
                  Shop / Company Name
                </label>
                <input id="profile-name" name="profileName" defaultValue={profile.name} />
              </div>
              <div>
                <label className="field-label" htmlFor="profile-tagline">
                  Short Description
                </label>
                <input id="profile-tagline" name="profileTagline" defaultValue={profile.tagline} />
              </div>
              <div className="wide-field">
                <label className="field-label" htmlFor="profile-logo">
                  Upload Logo
                </label>
                <input accept="image/*" id="profile-logo" name="profileLogo" type="file" />
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
        </details>

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

      <section className="content-grid">
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

      <section className="panel">
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

      <section className="panel">
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
                <button className="delete-entry-button" type="button" onClick={() => removeVoucher(voucher.id)}>
                  Delete
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
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

      <section className="content-grid">
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
  );
}

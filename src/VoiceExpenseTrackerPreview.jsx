import { useEffect, useMemo, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';

const STORAGE_KEY = 'businessLogs';
const PROFILE_KEY = 'businessProfile';
const DEFAULT_PROFILE = {
  name: 'Voice Business Tracker',
  tagline: 'Simple voice and manual dashboard for any small business',
  logo: '/assets/logo.svg',
};

const features = [
  {
    title: 'Voice Expense Entry',
    example: 'Today I spent 500 rupees on business material',
  },
  {
    title: 'Daily Work Log',
    example: 'Today I completed 25 orders',
  },
  {
    title: 'Manual Daily Entry',
    example: 'Write expenses, routine work, income, and daily things by hand',
  },
  {
    title: 'Income Tracking',
    example: 'Received 2500 rupees from customer',
  },
  {
    title: 'Monthly Reports',
    example: 'Complete business activity summary',
  },
];

const futureFeatures = [
  'English Voice Recognition',
  'Hindi Voice Recognition',
  'Gujarati Voice Recognition',
  'Local Database Storage',
  'AI Expense Detection',
  'Excel Export Ready',
  'PDF Invoice System',
  'Smart Profit Analytics',
  'Automatic Inventory Tracking',
  'Order Management System',
  'QR Payment Entry',
  'AI Profit Suggestions',
];

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function readSavedLogs() {
  try {
    const savedLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(savedLogs) ? savedLogs : [];
  } catch {
    return [];
  }
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
    normalizedText.includes('payment')
  ) {
    return 'Income';
  }

  if (
    normalizedText.includes('spent') ||
    normalizedText.includes('expense') ||
    normalizedText.includes('kharch')
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

export default function VoiceExpenseTrackerPreview() {
  const [transcript, setTranscript] = useState('Click start and speak your expense...');
  const [status, setStatus] = useState('Idle');
  const [language, setLanguage] = useState('en-US');
  const [logs, setLogs] = useState([]);
  const [manualType, setManualType] = useState('Expense');
  const [manualAmount, setManualAmount] = useState('');
  const [manualText, setManualText] = useState('');
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [browserSupported, setBrowserSupported] = useState(true);

  useEffect(() => {
    if (!getSpeechRecognition()) {
      setBrowserSupported(false);
    }

    setLogs(readSavedLogs());
    setProfile(readProfile());
  }, []);

  const totals = useMemo(() => {
    return logs.reduce(
      (summary, log) => {
        if (log.type === 'Income') {
          summary.income += log.amount || 0;
        }

        if (log.type === 'Expense') {
          summary.expense += log.amount || 0;
        }

        return summary;
      },
      { income: 0, expense: 0 }
    );
  }, [logs]);

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

        const newLog = {
          type: detectedType,
          text: voiceText,
          amount,
          date: new Date().toLocaleString(),
        };

        saveLog(newLog);
        setStatus('Voice saved successfully');
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

  const saveManualEntry = (event) => {
    event.preventDefault();

    const text = manualText.trim();
    const amount = Number(manualAmount) || 0;

    if (!text) {
      setStatus('Please write entry details before saving');
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
    setStatus('Manual entry saved successfully');
    setManualText('');
    setManualAmount('');
  };

  const fillManualTemplate = (type, amount, text) => {
    setManualType(type);
    setManualAmount(amount ? String(amount) : '');
    setManualText(text);
  };

  const clearLogs = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLogs([]);
    setStatus('All logs cleared');
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
            <h2>Today Income</h2>
            <p>{formatCurrency(totals.income)}</p>
          </article>

          <article className="stat-card expense">
            <h2>Today Expense</h2>
            <p>{formatCurrency(totals.expense)}</p>
          </article>

          <article className="stat-card profit">
            <h2>Net Profit</h2>
            <p>{formatCurrency(totals.income - totals.expense)}</p>
          </article>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>Voice Command Demo</h2>

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

          <button className="primary-button" onClick={startVoiceRecognition}>
            Start Voice Tracking
          </button>

          <button className="danger-button" onClick={clearLogs}>
            Clear All Logs
          </button>

          <div className="status-box">
            <p className="label">Current Status:</p>
            <p>{status}</p>

            <p className="label spaced">Voice Transcript:</p>
            <p>{transcript}</p>
          </div>
        </article>

        <article className="panel">
          <h2>Manual Entry</h2>

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
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
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
                  onChange={(event) => setManualAmount(event.target.value)}
                  placeholder="Example: 500"
                  step="1"
                  type="number"
                  value={manualAmount}
                />
              </div>

              <div className="wide-field">
                <label className="field-label" htmlFor="manual-text">
                  Write Details
                </label>
                <textarea
                  id="manual-text"
                  onChange={(event) => setManualText(event.target.value)}
                  placeholder="Example: Bought material, packed orders, completed service work, or added a daily note"
                  value={manualText}
                />
              </div>
            </div>

            <button className="manual-button" type="submit">
              Save Manual Entry
            </button>
          </form>

          <div className="quick-actions">
            <button
              type="button"
              onClick={() => fillManualTemplate('Routine Work', 0, 'Completed routine business work')}
            >
              Routine Work
            </button>
            <button type="button" onClick={() => fillManualTemplate('Daily Note', 0, 'Important daily note')}>
              Daily Note
            </button>
            <button type="button" onClick={() => fillManualTemplate('Expense', 500, 'Spent 500 rupees on material')}>
              Expense
            </button>
            <button
              type="button"
              onClick={() => fillManualTemplate('Income', 2500, 'Received 2500 rupees from customer')}
            >
              Income
            </button>
          </div>
        </article>
      </section>

      <section className="panel">
        <h2>Core Features</h2>

        <div className="feature-list">
          {features.map((item) => (
            <div className="feature-item" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.example}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <span>{logs.length} Logs</span>
        </div>

        <div className="activity-list">
          {logs.length === 0 ? (
            <div className="empty-state">No activity found. Start voice tracking to save logs.</div>
          ) : (
            logs.map((log, index) => (
              <article className="activity-item" key={`${log.date}-${index}`}>
                <div>
                  <p className="activity-type">{log.type}</p>
                  <p>{log.text}</p>
                  <time>{log.date}</time>
                </div>
                {(log.type === 'Income' || log.type === 'Expense') && log.amount > 0 && (
                  <strong>{formatCurrency(log.amount)}</strong>
                )}
                <button className="delete-entry-button" type="button" onClick={() => deleteLog(index)}>
                  Delete
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="advanced-panel">
        <h2>Future Advanced Features</h2>

        <div className="advanced-grid">
          {futureFeatures.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      </section>
      <Analytics />
    </main>
  );
}

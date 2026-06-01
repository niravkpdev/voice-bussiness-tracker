import { parseVoiceCommand } from './accounting.js';
import { normalizeAmount, sanitizeText } from './security.js';

const TYPE_MAP = {
  Receipt: 'payment_received',
  Payment: 'expense',
  Sales: 'income',
  Purchase: 'expense',
};

const ACCOUNTING_TYPE_MAP = {
  income: 'Sales',
  expense: 'Payment',
  inventory: 'Purchase',
  customer_due: 'Sales',
  payment_received: 'Receipt',
};

const KEYWORDS = {
  income: ['sale', 'sales', 'sold', 'income', 'invoice', 'aavak', 'kamai', 'વેચાણ', 'आमदनी'],
  expense: ['expense', 'spent', 'paid', 'kharch', 'bill', 'rent', 'purchase', 'kharidi', 'ખર્ચ', 'खर्च'],
  inventory: ['stock', 'inventory', 'product', 'unit', 'qty', 'quantity', 'maal', 'સામાન', 'स्टॉक'],
  customer_due: ['owes', 'due', 'udhar', 'credit', 'baaki', 'બાકી', 'उधार'],
  payment_received: ['received', 'payment from', 'mila', 'receipt', 'paid by', 'મળ્યા', 'मिला'],
};

function scoreConfidence(text, amount, speechConfidence) {
  const normalized = text.toLowerCase();
  let score = Number.isFinite(speechConfidence) && speechConfidence > 0 ? speechConfidence : 0.52;

  if (amount > 0) score += 0.18;
  if (Object.values(KEYWORDS).some((words) => words.some((word) => normalized.includes(word)))) score += 0.14;
  if (/\b(from|to|se|ko|for|customer|supplier)\b/i.test(text)) score += 0.08;
  if (text.length < 8) score -= 0.2;

  return Math.min(0.98, Math.max(0.15, Number(score.toFixed(2))));
}

function detectBusinessType(text, fallbackType) {
  const normalized = text.toLowerCase();
  const match = Object.entries(KEYWORDS).find(([, words]) => words.some((word) => normalized.includes(word)));
  return match?.[0] || TYPE_MAP[fallbackType] || 'expense';
}

export function parseReliableVoiceCommand(text, existingParties = [], speechConfidence = 0) {
  const transcript = sanitizeText(text, 500);
  const legacy = parseVoiceCommand(transcript, existingParties);
  const amount = normalizeAmount(legacy.amount);
  const type = detectBusinessType(transcript, legacy.type);
  const confidence = scoreConfidence(transcript, amount, speechConfidence);

  return {
    type,
    accountingType: ACCOUNTING_TYPE_MAP[type] || legacy.type,
    amount,
    category: sanitizeText(legacy.category || (type === 'income' ? 'Sales' : 'General Expense'), 120),
    customer: sanitizeText(legacy.partyName || '', 120),
    partyName: sanitizeText(legacy.partyName || '', 120),
    partyLedgerId: legacy.partyLedgerId || '',
    date: new Date().toISOString().slice(0, 10),
    notes: transcript,
    narration: transcript,
    transcript,
    confidence,
    needsConfirmation: true,
    unclear: confidence < 0.35 || (amount <= 0 && type !== 'inventory'),
  };
}

export function mapVoiceTypeToAccounting(type) {
  return ACCOUNTING_TYPE_MAP[type] || type || 'Payment';
}

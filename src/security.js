const TEXT_LIMIT = 600;

export function sanitizeText(value, maxLength = TEXT_LIMIT) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(value) {
  return sanitizeText(value, 160).toLowerCase();
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizeEmail(email));
}

export function validatePassword(password) {
  return String(password || '').length >= 8;
}

export function validatePhone(phone) {
  const cleaned = sanitizeText(phone, 24);
  return !cleaned || /^[+0-9\s-]{8,24}$/.test(cleaned);
}

export function normalizeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

export function validateVoicePayload(payload) {
  const errors = [];
  const amount = normalizeAmount(payload.amount);
  const confidence = Number(payload.confidence ?? 0);

  if (amount <= 0 && payload.type !== 'inventory') {
    errors.push('Amount must be greater than zero.');
  }

  if (confidence < 0.35) {
    errors.push('Voice confidence is low. Please review or retry.');
  }

  if (!sanitizeText(payload.notes || payload.narration, 300)) {
    errors.push('Narration is required.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function canRunRateLimitedAction(actionKey, { limit = 12, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const key = `vbt-rate:${actionKey}`;

  try {
    const history = JSON.parse(localStorage.getItem(key) || '[]')
      .filter((timestamp) => now - timestamp < windowMs);

    if (history.length >= limit) {
      const secondsLeft = Math.ceil((windowMs - (now - history[0])) / 1000);
      return {
        allowed: false,
        message: `Too many attempts. Please try again in ${secondsLeft} seconds.`,
      };
    }

    localStorage.setItem(key, JSON.stringify([...history, now]));
    return { allowed: true, message: '' };
  } catch {
    localStorage.setItem(key, JSON.stringify([now]));
    return { allowed: true, message: '' };
  }
}

export function publicSafeError(error, fallback = 'Something went wrong. Please try again.') {
  const message = String(error?.message || fallback);

  if (error?.code === 'firestore/consumer-invalid' || /CONSUMER_INVALID|firestore\.googleapis\.com/i.test(message)) {
    return 'Cloud Firestore API is not enabled or Firebase project id is wrong. Enable Cloud Firestore API for this Firebase project and check Vercel Firebase environment variables.';
  }

  if (error?.code === 'firestore/rest-403' || /PERMISSION_DENIED/i.test(message)) {
    return 'Firestore permission denied. Check Firestore API, Firebase project id, App Check enforcement, and Firestore security rules.';
  }

  if (error?.code === 'firestore/write-timeout') {
    return 'Firestore write timed out. Check Firestore API access, network, App Check, and Firebase rules.';
  }

  if (/api[_ -]?key|token|secret|credential|password/i.test(message)) {
    return fallback;
  }

  return sanitizeText(message, 180) || fallback;
}

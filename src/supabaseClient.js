import { createClient } from '@supabase/supabase-js';
import { sanitizeEmail, sanitizeText } from './security.js';

const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

const CLOUD_TABLES = new Set([
  'transactions',
  'customers',
  'suppliers',
  'inventory',
  'stock_transactions',
  'invoices',
  'orders',
  'employees',
  'attendance',
  'leave_balances',
  'leave_requests',
  'holidays',
  'salary_history',
  'payslips',
  'employee_documents',
  'payments',
  'audit_logs',
  'subscriptions',
  'security_settings',
  'devices',
  'offline_queue',
  'businesses',
  'notifications',
  'reports',
  'settings',
]);

const CLOUD_TIMEOUT_MS = 10_000;
const CLOUD_TIMEOUT_MESSAGE = 'Supabase write timed out. Please check Supabase project, RLS policies, API keys, or env variables.';
const HRMS_DOCUMENT_BUCKET = import.meta.env.VITE_SUPABASE_HRMS_BUCKET || 'hrms-documents';

let supabaseClient;
let projectLogged = false;
const SHOULD_DEBUG_DATABASE = import.meta.env.DEV || import.meta.env.VITE_DEBUG_DATABASE === 'true';

function sanitizeLogValue(value) {
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeLogValue);
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (/payload|data|row|token|jwt|password|secret|anonKey/i.test(key)) {
      return [key, '[redacted]'];
    }
    return [key, sanitizeLogValue(entry)];
  }));
}

function cloudInfo(...args) {
  if (SHOULD_DEBUG_DATABASE) {
    console.info(...args);
  }
}

function cloudError(...args) {
  if (SHOULD_DEBUG_DATABASE) {
    console.error(...args);
    return;
  }
  console.error(...args.map(sanitizeLogValue));
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseConfigError() === '');
}

export function getSupabaseProjectHost() {
  try {
    return supabaseConfig.url ? new URL(supabaseConfig.url).hostname : '';
  } catch {
    return supabaseConfig.url || '';
  }
}

export function getSupabaseUrl() {
  return supabaseConfig.url || '';
}

function getSupabaseConfigError() {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    return 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.';
  }

  try {
    const parsed = new URL(supabaseConfig.url);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
      return 'VITE_SUPABASE_URL must look like https://your-project-ref.supabase.co.';
    }
  } catch {
    return 'VITE_SUPABASE_URL is not a valid URL.';
  }

  if (!String(supabaseConfig.anonKey).startsWith('ey')) {
    return 'VITE_SUPABASE_ANON_KEY must be the anon public JWT key from Supabase Project Settings > API.';
  }

  return '';
}

export function getSupabaseClient() {
  const configError = getSupabaseConfigError();
  if (configError) {
    if (!supabaseConfig.url && !supabaseConfig.anonKey) {
      return null;
    }
    const error = new Error(configError);
    error.code = 'supabase/config-invalid';
    throw error;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  if (!projectLogged) {
    cloudInfo('SUPABASE_PROJECT', {
      url: supabaseConfig.url || null,
      host: getSupabaseProjectHost() || null,
    });
    projectLogged = true;
  }

  return supabaseClient;
}

function normalizeSupabaseEmail(email) {
  return sanitizeEmail(email).toLowerCase().trim();
}

function cloudTimeoutError(meta) {
  const error = new Error(CLOUD_TIMEOUT_MESSAGE);
  error.code = 'supabase/write-timeout';
  cloudError('SUPABASE_WRITE_TIMEOUT', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: meta.currentSupabaseUserUid || null,
    requestedUid: meta.uid || null,
    path: meta.path || null,
    operation: meta.operation || null,
  });
  return error;
}

function withCloudTimeout(promise, meta) {
  let timer;
  const timeout = new Promise((_, reject) => {
    const setTimer = typeof window !== 'undefined' ? window.setTimeout : setTimeout;
    timer = setTimer(() => reject(cloudTimeoutError(meta)), CLOUD_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    const clearTimer = typeof window !== 'undefined' ? window.clearTimeout : clearTimeout;
    clearTimer(timer);
  });
}

async function getCurrentSupabaseUser(client = getSupabaseClient()) {
  if (!client) {
    return null;
  }
  const { data, error } = await client.auth.getUser();
  if (error) {
    if (/session.*missing|auth session missing/i.test(error.message || '')) {
      return null;
    }
    throw error;
  }
  return data?.user || null;
}

export async function createEmployeeLogin(email, password, employeeId, businessId) {
  const client = getSupabaseClient();
  if (!client) return { error: { message: 'No Supabase client' } };
  
  const currentUid = await ensureAuthenticated();
  if (!currentUid) return { error: { message: 'Not authenticated' } };

  cloudInfo('[Creating employee login]', { email, employeeId, businessId });
  const { data, error } = await withCloudTimeout(
    client.rpc('create_employee_login', {
      p_email: email,
      p_password: password,
      p_employee_id: employeeId,
      p_business_id: businessId || 'default',
    }),
    { operation: 'rpc:create_employee_login' }
  );

  if (error) {
    cloudError('[createEmployeeLogin error]', error);
    return { error };
  }
  return { data, error: null };
}

export async function resetEmployeePassword(employeeId, businessId, newPassword) {
  const client = getSupabaseClient();
  if (!client) return { error: { message: 'No Supabase client' } };

  const { data, error } = await withCloudTimeout(
    client.rpc('reset_employee_password', {
      p_employee_id: employeeId,
      p_business_id: businessId || 'default',
      p_new_password: newPassword,
    }),
    { operation: 'rpc:reset_employee_password' }
  );

  if (error) {
    cloudError('[resetEmployeePassword error]', error);
    return { error };
  }
  return { data, error: null };
}

export async function disableEmployeeLogin(employeeId, businessId) {
  const client = getSupabaseClient();
  if (!client) return { error: { message: 'No Supabase client' } };

  const { data, error } = await withCloudTimeout(
    client.rpc('disable_employee_login', {
      p_employee_id: employeeId,
      p_business_id: businessId || 'default',
    }),
    { operation: 'rpc:disable_employee_login' }
  );

  if (error) {
    cloudError('[disableEmployeeLogin error]', error);
    return { error };
  }
  return { data, error: null };
}

export async function employeeChangePassword(newPassword) {
  const client = getSupabaseClient();
  if (!client) return { error: { message: 'No Supabase client' } };

  const { data, error } = await withCloudTimeout(
    client.rpc('employee_change_password', {
      p_new_password: newPassword,
    }),
    { operation: 'rpc:employee_change_password' }
  );

  if (error) {
    cloudError('[employeeChangePassword error]', error);
    return { error };
  }
  
  // also refresh session
  await client.auth.refreshSession();
  return { data, error: null };
}


function userPayload(user, extra = {}) {
  const metadata = user?.user_metadata || {};
  return {
    uid: user?.id || extra.uid || '',
    email: sanitizeEmail(user?.email || extra.email || ''),
    ownerName: sanitizeText(metadata.ownerName || extra.ownerName || 'Business Owner', 120),
    businessName: sanitizeText(metadata.businessName || extra.businessName || 'Voice Business Tracker', 140),
    role: metadata.role || extra.role || 'Owner',
    provider: user?.app_metadata?.provider || extra.provider || 'email',
    emailVerified: Boolean(user?.email_confirmed_at || user?.confirmed_at),
    confirmationSentAt: user?.confirmation_sent_at || extra.confirmationSentAt || '',
    forcePasswordChange: Boolean(user?.app_metadata?.force_password_change),
    confirmedAt: user?.email_confirmed_at || user?.confirmed_at || extra.confirmedAt || '',
    lastSignInAt: user?.last_sign_in_at || extra.lastSignInAt || '',
    sessionState: extra.sessionState || 'unknown',
    loginAt: new Date().toISOString(),
  };
}

function authRedirectTo() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return new URL('/react.html', window.location.origin).toString();
}

function passwordRecoveryRedirectTo() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return new URL('/react.html?auth=recovery', window.location.origin).toString();
}

export function isPasswordRecoveryRoute() {
  if (typeof window === 'undefined') {
    return false;
  }

  const query = window.location.search || '';
  const hash = window.location.hash || '';
  const combined = `${query}&${hash.replace(/^#/, '')}`;

  return /[?&]auth=recovery\b/.test(query)
    || /(?:^|[&#?])type=recovery\b/.test(combined)
    || /(?:^|[&#?])code=/.test(combined)
    || /(?:^|[&#?])error_code=otp_expired\b/.test(combined)
    || /(?:^|[&#?])error=access_denied\b/.test(combined);
}

function recoveryUrlParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  const params = new URLSearchParams(window.location.search || '');
  const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  hashParams.forEach((value, key) => {
    if (!params.has(key)) {
      params.set(key, value);
    }
  });
  return params;
}

function redactAuthResponse(value) {
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redactAuthResponse);
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (/token|jwt/i.test(key)) {
      return [key, entry ? '[redacted]' : entry];
    }
    return [key, redactAuthResponse(entry)];
  }));
}

function rowToAppRecord(row, tableName) {
  if (!row) {
    return null;
  }
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  let normalized = { ...data };

  // Apply table-specific normalizations
  if (tableName === 'transactions') {
    normalized = {
      ...normalized,
      type: normalized.type || normalized.voucher_type || 'Journal',
      date: normalized.date || row.created_at?.slice(0, 10),
      amount: normalized.amount !== undefined ? normalized.amount : (normalized.lines?.[0]?.debit || 0),
      narration: normalized.narration || '',
      debitLedgerId: normalized.debit_account || normalized.lines?.find((l) => l.debit > 0)?.ledgerId || '',
      creditLedgerId: normalized.credit_account || normalized.lines?.find((l) => l.credit > 0)?.ledgerId || '',
      partyLedgerId: normalized.party_id || '',
      partyName: normalized.party_name || '',
    };
  } else if (tableName === 'invoices') {
    normalized = {
      ...normalized,
      invoiceNo: normalized.invoice_number || normalized.invoiceNo,
      customerName: normalized.customer_name || normalized.customerName,
      customerId: normalized.customer_id || normalized.customerId,
      taxable: normalized.subtotal || normalized.taxable || 0,
      gstTotal: normalized.tax || normalized.gstTotal || 0,
      total: normalized.total !== undefined ? normalized.total : 0,
      paid: normalized.paid_amount || normalized.paid || 0,
      balance: normalized.balance_due !== undefined ? normalized.balance_due : normalized.balance,
      dueDate: normalized.due_date || normalized.dueDate,
      date: normalized.invoice_date || normalized.date,
      lines: normalized.items || normalized.lines || [],
      terms: normalized.notes || normalized.terms || '',
    };
  } else if (tableName === 'orders') {
    normalized = {
      ...normalized,
      orderNo: normalized.order_number || normalized.orderNo,
      customerName: normalized.customer_name || normalized.customerName || normalized.customer,
      total: normalized.total || normalized.amount || 0,
    };
  } else if (tableName === 'payments') {
    normalized = {
      ...normalized,
      invoiceId: normalized.invoice_id || normalized.invoiceId,
      mode: normalized.payment_method || normalized.mode || 'UPI',
    };
  } else if (tableName === 'stock_transactions') {
    normalized = {
      ...normalized,
      type: normalized.type === 'stock_in' ? 'Stock In' : normalized.type === 'stock_out' ? 'Stock Out' : normalized.type === 'adjustment' ? 'Adjustment' : normalized.type,
      productId: normalized.product_id || normalized.productId,
      qty: normalized.quantity || normalized.qty || 0,
      note: normalized.reason || normalized.note || '',
    };
  }

  return {
    ...normalized,
    id: data.id || row.id,
    userId: row.user_id,
    ownerUid: row.user_id,
    createdAt: data.createdAt || row.created_at,
    updatedAt: data.updatedAt || row.updated_at,
  };
}

function buildRow(uid, id, data) {
  return {
    id,
    user_id: uid,
    data: {
      ...data,
      id: data?.id || id,
      userId: uid,
      ownerUid: uid,
      updatedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };
}

async function syncUserProfileBestEffort(uid, profile) {
  try {
    await saveUserProfile(uid, profile);
  } catch (error) {
    cloudError('SUPABASE_PROFILE_SYNC_SKIPPED', {
      uid,
      code: error?.code || null,
      message: error?.message || String(error),
    });
  }
}

function pathFor(uid, tableName, id = '') {
  if (tableName === 'settings') {
    return `users/${uid}/settings/${id || 'profile'}`;
  }
  if (tableName === 'debug_tests') {
    return `users/${uid}/debug/${id || 'test'}`;
  }
  return `users/${uid}/${tableName}${id ? `/${id}` : ''}`;
}

function mapAuthError(error) {
  const code = String(error?.code || error?.name || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'auth/invalid-credential';
  if (message.includes('email not confirmed')) return 'auth/email-not-verified';
  if (message.includes('already registered') || message.includes('already exists')) return 'auth/email-already-in-use';
  if (message.includes('security purposes') || message.includes('rate limit') || message.includes('too many')) return 'auth/too-many-requests';
  if (message.includes('password')) return 'auth/weak-password';
  if (message.includes('invalid email')) return 'auth/invalid-email';
  return code || 'auth/error';
}

export function getSupabaseAuthErrorMessage(error, fallback = 'Authentication failed. Please try again.') {
  const code = String(error?.code || mapAuthError(error)).toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const messages = {
    'supabase/config-invalid': error?.message || 'Supabase environment variables are invalid. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.',
    'auth/invalid-email': 'Enter a valid email.',
    'auth/missing-email': 'Please enter your email address.',
    'auth/user-disabled': 'This account has been disabled. Contact support.',
    'auth/user-not-found': 'No account exists with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
    'auth/invalid-credential': 'Email or password is incorrect. Please check both and try again.',
    'auth/email-already-in-use': 'This email is already registered. Please login instead.',
    'auth/weak-password': 'Password is too weak. Use at least 8 characters.',
    'auth/too-many-requests': 'Supabase is temporarily limiting reset emails for safety. Please wait 60 seconds, then request one new link.',
    'auth/network-request-failed': 'Network error. Check your internet.',
    'auth/popup-closed-by-user': 'Google login was closed before completion.',
    'auth/requires-recent-login': 'Please login again before doing this action.',
    'auth/email-not-verified': 'Please verify your email before logging in.',
    'auth/recovery-link-expired': 'Password reset link expired. Please request a new reset link and open the latest email.',
    'auth/recovery-link-invalid': 'Password reset link is invalid. Please request a new reset link.',
    'auth/recovery-session-missing': 'Password reset session expired. Please request a new reset link and open the latest email.',
  };

  if (message.includes('invalid login credentials')) {
    return messages['auth/invalid-credential'];
  }

  if (message.includes('already registered') || message.includes('already exists')) {
    return messages['auth/email-already-in-use'];
  }

  if (message.includes('security purposes') || message.includes('rate limit') || message.includes('too many')) {
    return messages['auth/too-many-requests'];
  }

  if (message.includes('invalid api key') || message.includes('jwt')) {
    return 'Supabase anon key is invalid. Copy the anon public key from Supabase Project Settings > API and redeploy Vercel.';
  }

  if (message.includes('failed to fetch') || message.includes('networkerror')) {
    return 'Could not reach Supabase. Check VITE_SUPABASE_URL, Vercel deployment env vars, and internet connection.';
  }

  return messages[code] || fallback;
}

export async function createSupabaseAccount({ email, password, ownerName, businessName }) {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const normalizedEmail = normalizeSupabaseEmail(email);
  const emailRedirectTo = authRedirectTo();
  cloudInfo('[Supabase auth register start]', { email: normalizedEmail, emailRedirectTo });
  const signUpResponse = await client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo,
      data: {
        ownerName: sanitizeText(ownerName || 'Business Owner', 120),
        businessName: sanitizeText(businessName || 'Voice Business Tracker', 140),
        role: 'Owner',
      },
    },
  });
  const { data, error } = signUpResponse;
  cloudInfo('SUPABASE_SIGNUP_RESPONSE', redactAuthResponse({
    data,
    error,
    emailRedirectTo,
  }));

  if (error) {
    error.code = mapAuthError(error);
    cloudError('SUPABASE_SIGNUP_ERROR', {
      code: error.code,
      message: error.message,
      status: error.status || null,
      email: normalizedEmail,
      emailRedirectTo,
    });
    throw error;
  }

  const user = data?.user;
  if (!user) {
    throw new Error('Supabase did not return a registered user.');
  }

  const alreadyExistsUnconfirmedLikely = Array.isArray(user.identities) && user.identities.length === 0 && !user.email_confirmed_at;
  cloudInfo('REGISTER_SUCCESS', {
    uid: user.id,
    email: normalizedEmail,
    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at),
    confirmationSentAt: user.confirmation_sent_at || null,
    alreadyExistsUnconfirmedLikely,
  });
  cloudInfo('EMAIL_VERIFICATION_SENT', { uid: user.id, email: normalizedEmail, emailRedirectTo });
  const payload = userPayload(user, {
    email: normalizedEmail,
    ownerName,
    businessName,
    sessionState: data?.session ? 'active' : 'verification-required',
  });
  payload.confirmationSentAt = user.confirmation_sent_at || '';
  payload.lastAuthActionAt = new Date().toISOString();
  payload.emailRedirectTo = emailRedirectTo || '';
  payload.alreadyExistsUnconfirmedLikely = alreadyExistsUnconfirmedLikely;
  if (data?.session) {
    await syncUserProfileBestEffort(payload.uid, payload);
  }
  cloudInfo('[Supabase auth register success]', {
    uid: payload.uid,
    email: payload.email,
    emailVerified: payload.emailVerified,
    sessionState: payload.sessionState,
    alreadyExistsUnconfirmedLikely,
  });
  return payload;
}

export async function signInSupabaseAccount({ email, password }) {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const normalizedEmail = normalizeSupabaseEmail(email);
  cloudInfo('[Supabase auth login start]', { email: normalizedEmail });
  const signInResponse = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  const { data, error } = signInResponse;
  cloudInfo('SUPABASE_SIGNIN_RESPONSE', redactAuthResponse({ data, error }));

  if (error) {
    error.code = mapAuthError(error);
    cloudError('SUPABASE_SIGNIN_ERROR', {
      code: error.code,
      message: error.message,
      status: error.status || null,
      email: normalizedEmail,
    });
    throw error;
  }

  const user = data?.user;
  if (!user) {
    throw new Error('Supabase did not return a logged-in user.');
  }

  const payload = userPayload(user, { email: normalizedEmail, sessionState: data?.session ? 'active' : 'missing-session' });
  await syncUserProfileBestEffort(payload.uid, payload);
  cloudInfo('LOGIN_SUCCESS', { uid: payload.uid, emailVerified: payload.emailVerified });
  cloudInfo('[Supabase auth login success]', { uid: payload.uid, email: payload.email });
  return payload;
}

export async function signInSupabaseGoogle() {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) {
    error.code = mapAuthError(error);
    throw error;
  }
  return null;
}

export async function sendCurrentUserEmailVerification(emailOverride = '') {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const email = normalizeSupabaseEmail(user?.email || emailOverride);
  if (!client || !email) {
    const error = new Error('No email is available for verification resend.');
    error.code = 'auth/missing-email';
    throw error;
  }

  const emailRedirectTo = authRedirectTo();
  cloudInfo('SUPABASE_RESEND_VERIFICATION_START', {
    uid: user?.id || null,
    email,
    emailRedirectTo,
    sessionState: user ? 'active' : 'missing-session-email-only',
  });
  const resendResponse = await client.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo,
    },
  });
  const { data, error } = resendResponse;
  cloudInfo('SUPABASE_RESEND_VERIFICATION_RESPONSE', redactAuthResponse({
    data,
    error,
    email,
    emailRedirectTo,
  }));
  if (error) {
    error.code = mapAuthError(error);
    cloudError('SUPABASE_RESEND_VERIFICATION_ERROR', {
      code: error.code,
      message: error.message,
      status: error.status || null,
      email,
      emailRedirectTo,
    });
    throw error;
  }
  const lastResendAt = new Date().toISOString();
  cloudInfo('EMAIL_VERIFICATION_SENT', { uid: user?.id || null, email, emailRedirectTo, lastResendAt });
  return {
    ok: true,
    uid: user?.id || '',
    email,
    emailRedirectTo,
    lastResendAt,
    sessionState: user ? 'active' : 'missing-session-email-only',
  };
}

export async function reloadCurrentSupabaseUser() {
  const user = await getCurrentSupabaseUser();
  return user ? userPayload(user) : null;
}

export async function sendSupabasePasswordReset(email) {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  const normalizedEmail = normalizeSupabaseEmail(email);
  const redirectTo = passwordRecoveryRedirectTo();
  cloudInfo('PASSWORD_RESET_START', { email: normalizedEmail, redirectTo });
  const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    cloudError('PASSWORD_RESET_ERROR', {
      code: mapAuthError(error),
      message: error?.message || '',
    });
    error.code = mapAuthError(error);
    throw error;
  }

  cloudInfo('PASSWORD_RESET_SUCCESS', { email: normalizedEmail, redirectTo });
  return true;
}

export async function updateCurrentUserPassword(newPassword) {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData?.session?.user) {
    const error = new Error('Password reset session expired. Please request a new reset link and open the latest email.');
    error.code = sessionError ? mapAuthError(sessionError) : 'auth/recovery-session-missing';
    cloudError('PASSWORD_UPDATE_SESSION_MISSING', {
      code: error.code,
      message: sessionError?.message || error.message,
    });
    throw error;
  }

  cloudInfo('PASSWORD_UPDATE_START');
  const { data, error } = await client.auth.updateUser({ password: String(newPassword || '') });
  cloudInfo('SUPABASE_PASSWORD_UPDATE_RESPONSE', redactAuthResponse({ data, error }));
  if (error) {
    cloudError('PASSWORD_UPDATE_ERROR', {
      code: mapAuthError(error),
      message: error?.message || '',
      status: error?.status || null,
    });
    error.code = mapAuthError(error);
    throw error;
  }
  cloudInfo('PASSWORD_UPDATE_SUCCESS', { uid: data?.user?.id || null });
  return true;
}

export async function prepareSupabasePasswordRecoverySession() {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const params = recoveryUrlParams();
  const errorCode = params.get('error_code') || params.get('error');
  const errorDescription = params.get('error_description') || '';

  cloudInfo('PASSWORD_RECOVERY_PREPARE_START', {
    hasCode: Boolean(params.get('code')),
    hasAccessToken: Boolean(params.get('access_token')),
    hasRefreshToken: Boolean(params.get('refresh_token')),
    errorCode: errorCode || null,
  });

  if (errorCode) {
    const error = new Error(errorDescription || 'Password reset link is expired or invalid. Please request a new reset link.');
    error.code = errorCode === 'otp_expired' ? 'auth/recovery-link-expired' : 'auth/recovery-link-invalid';
    cloudError('PASSWORD_RECOVERY_PREPARE_ERROR', { code: error.code, message: error.message });
    throw error;
  }

  const code = params.get('code');
  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    cloudInfo('PASSWORD_RECOVERY_EXCHANGE_RESPONSE', redactAuthResponse({ data, error }));
    if (error) {
      error.code = mapAuthError(error);
      cloudError('PASSWORD_RECOVERY_EXCHANGE_ERROR', {
        code: error.code,
        message: error.message,
        status: error.status || null,
      });
      throw error;
    }
  } else {
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data, error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      cloudInfo('PASSWORD_RECOVERY_SET_SESSION_RESPONSE', redactAuthResponse({ data, error }));
      if (error) {
        error.code = mapAuthError(error);
        cloudError('PASSWORD_RECOVERY_SET_SESSION_ERROR', {
          code: error.code,
          message: error.message,
          status: error.status || null,
        });
        throw error;
      }
    }
  }

  const { data, error } = await client.auth.getSession();
  cloudInfo('PASSWORD_RECOVERY_SESSION_RESPONSE', redactAuthResponse({ data, error }));
  if (error || !data?.session?.user) {
    const sessionError = error || new Error('Password reset session is not active. Please request a new reset link and open the latest email.');
    sessionError.code = error ? mapAuthError(error) : 'auth/recovery-session-missing';
    cloudError('PASSWORD_RECOVERY_SESSION_ERROR', {
      code: sessionError.code,
      message: sessionError.message,
    });
    throw sessionError;
  }

  if (typeof window !== 'undefined') {
    window.history.replaceState({}, document.title, '/react.html?auth=recovery');
  }

  const user = userPayload(data.session.user, { sessionState: 'password-recovery' });
  cloudInfo('PASSWORD_RECOVERY_SESSION_READY', { uid: user.uid, email: user.email });
  return user;
}

export async function runSupabaseDebugTest() {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const uid = user?.id;
  const path = uid ? pathFor(uid, 'debug_tests', 'test') : null;

  cloudInfo('DEBUG_SUPABASE_TEST_START', {
    uid: uid || null,
    path,
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
  });

  try {
    if (!client || !user || !uid) {
      throw new Error('No authenticated Supabase user is available for database debug test.');
    }

    const row = {
      id: 'test',
      user_id: uid,
      message: 'hello supabase',
      data: {
        id: 'test',
        message: 'hello supabase',
        testValue: 'supabase debug ok',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };
    await withCloudTimeout(
      client.from('debug_tests').upsert(row, { onConflict: 'user_id,id' }),
      { path, uid, currentSupabaseUserUid: uid, operation: 'upsert:debugTest' }
    ).then(({ error }) => {
      if (error) throw error;
    });

    const { data, error } = await withCloudTimeout(
      client.from('debug_tests').select('*').eq('user_id', uid).eq('id', 'test').single(),
      { path, uid, currentSupabaseUserUid: uid, operation: 'select:debugTestVerify' }
    );
    if (error) throw error;
    if (!data) {
      const verificationError = new Error(`Supabase debug verification failed: row not found at ${path}`);
      verificationError.code = 'supabase/verification-failed';
      throw verificationError;
    }

    cloudInfo('DEBUG_SUPABASE_TEST_SUCCESS', {
      uid,
      path,
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      verified: true,
    });
    return { ok: true, uid, path };
  } catch (error) {
    if (error?.code === 'supabase/write-timeout') {
      cloudError('DEBUG_SUPABASE_TEST_TIMEOUT', {
        uid: uid || null,
        path,
        projectId: getSupabaseProjectHost() || null,
        authDomain: supabaseConfig.url || null,
        code: error?.code || null,
        message: error?.message || String(error),
      });
    }
    cloudError('DEBUG_SUPABASE_TEST_ERROR', error?.code || null, error?.message || String(error), {
      uid: uid || null,
      path,
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
    });
    throw error;
  }
}

export async function signOutSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const user = await getCurrentSupabaseUser(client).catch(() => null);
  cloudInfo('[Supabase auth logout start]', { uid: user?.id || null });
  const { error } = await client.auth.signOut();
  if (error) {
    error.code = mapAuthError(error);
    throw error;
  }
  cloudInfo('[Supabase auth logout success]');
}

export async function listenToSupabaseAuth(onUser, onError) {
  let client;
  try {
    client = getSupabaseClient();
    if (!client) {
      return () => {};
    }
  } catch (error) {
    onError?.(error);
    return () => {};
  }

  client.auth.getSession().then(({ data, error }) => {
    cloudInfo('SUPABASE_GET_SESSION_RESPONSE', redactAuthResponse({ data, error }));
    const user = data?.session?.user;
    const isRecoveryUrl = isPasswordRecoveryRoute();
    onUser(user ? userPayload(user, { sessionState: isRecoveryUrl ? 'password-recovery' : 'active' }) : null);
  }).catch((error) => {
    if (/session.*missing|auth session missing/i.test(error?.message || '')) {
      onUser(null);
      return;
    }
    onError?.(error);
  });

  const { data } = client.auth.onAuthStateChange((event, session) => {
    try {
      cloudInfo('SUPABASE_AUTH_STATE_CHANGE', redactAuthResponse({ event, session }));
      const isRecoveryUrl = isPasswordRecoveryRoute();
      const sessionState = event === 'PASSWORD_RECOVERY' || isRecoveryUrl ? 'password-recovery' : session ? 'active' : 'missing-session';
      onUser(session?.user ? userPayload(session.user, { sessionState }) : null);
    } catch (error) {
      onError?.(error);
    }
  });

  return () => data?.subscription?.unsubscribe();
}

export async function saveUserProfile(uid, profile) {
  return saveCloudRecord(uid, 'settings', 'profile', profile);
}

export async function createInvoiceWithStock(uid, invoice, inventoryItems = []) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const currentUid = user?.id || null;
  const invoiceId = invoice?.id || '';
  const path = uid && invoiceId ? pathFor(uid, 'invoices', invoiceId) : null;

  if (!client || !uid || !invoiceId) {
    throw new Error('Missing Supabase client, uid, or invoice id for atomic invoice save.');
  }

  if (!currentUid) {
    throw new Error('No authenticated Supabase user is available for atomic invoice save.');
  }

  if (currentUid !== uid) {
    throw new Error('Authenticated Supabase uid does not match requested invoice owner uid.');
  }

  cloudInfo('SUPABASE_RPC_START', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: currentUid,
    requestedUid: uid,
    path,
    operation: 'create_invoice_with_stock',
    inventoryCount: Array.isArray(inventoryItems) ? inventoryItems.length : 0,
  });

  try {
    const { data, error } = await withCloudTimeout(
      client.rpc('create_invoice_with_stock', {
        p_invoice: {
          ...invoice,
          userId: uid,
          ownerUid: uid,
        },
        p_inventory: Array.isArray(inventoryItems)
          ? inventoryItems.map((item) => ({
              ...item,
              id: item.id || item.itemId,
              itemId: item.itemId || item.id,
              userId: uid,
              ownerUid: uid,
            }))
          : [],
      }),
      { path, uid, currentSupabaseUserUid: currentUid, operation: 'rpc:create_invoice_with_stock' }
    );

    if (error) {
      throw error;
    }

    if (!data?.invoice) {
      const rpcError = new Error('Atomic invoice RPC did not return a saved invoice.');
      rpcError.code = 'supabase/rpc-verification-failed';
      throw rpcError;
    }

    cloudInfo('SUPABASE_RPC_SUCCESS', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      path,
      operation: 'create_invoice_with_stock',
      inventoryCount: Array.isArray(data.inventory) ? data.inventory.length : 0,
      auditLogId: data.auditLogId || null,
    });

    return data;
  } catch (error) {
    cloudError('SUPABASE_RPC_ERROR', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      path,
      operation: 'create_invoice_with_stock',
      code: error?.code || null,
      message: error?.message || String(error),
    });
    throw error;
  }
}

export async function postPaymentWithLedger(uid, payment, ledgerPosting = {}) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const currentUid = user?.id || null;
  const paymentId = payment?.id || '';
  const path = uid && paymentId ? pathFor(uid, 'payments', paymentId) : null;

  if (!client || !uid || !paymentId) {
    throw new Error('Missing Supabase client, uid, or payment id for atomic payment posting.');
  }

  if (!currentUid) {
    throw new Error('No authenticated Supabase user is available for atomic payment posting.');
  }

  if (currentUid !== uid) {
    throw new Error('Authenticated Supabase uid does not match requested payment owner uid.');
  }

  cloudInfo('SUPABASE_RPC_START', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: currentUid,
    requestedUid: uid,
    path,
    operation: 'post_payment_with_ledger',
    invoiceId: payment?.invoiceId || null,
  });

  try {
    const { data, error } = await withCloudTimeout(
      client.rpc('post_payment_with_ledger', {
        p_payment: {
          ...payment,
          userId: uid,
          ownerUid: uid,
        },
        p_ledger_posting: {
          ...(ledgerPosting || {}),
          userId: uid,
          ownerUid: uid,
        },
      }),
      { path, uid, currentSupabaseUserUid: currentUid, operation: 'rpc:post_payment_with_ledger' }
    );

    if (error) {
      throw error;
    }

    if (!data?.payment || !data?.ledgerPosting) {
      const rpcError = new Error('Atomic payment RPC did not return both payment and ledger posting.');
      rpcError.code = 'supabase/rpc-verification-failed';
      throw rpcError;
    }

    cloudInfo('SUPABASE_RPC_SUCCESS', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      path,
      operation: 'post_payment_with_ledger',
      transactionId: data.ledgerPosting?.id || null,
      auditLogId: data.auditLogId || null,
    });

    return data;
  } catch (error) {
    cloudError('SUPABASE_RPC_ERROR', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      path,
      operation: 'post_payment_with_ledger',
      code: error?.code || null,
      message: error?.message || '',
    });
    throw error;
  }
}

export async function editPaymentWithLedgerReversal(uid, payment, ledgerPosting = {}) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const currentUid = user?.id || null;
  const paymentId = payment?.id || '';
  const path = uid && paymentId ? pathFor(uid, 'payments', paymentId) : null;

  if (!client || !uid || !paymentId) {
    throw new Error('Missing Supabase client, uid, or payment id for atomic payment edit.');
  }

  if (!currentUid) {
    throw new Error('No authenticated Supabase user is available for atomic payment edit.');
  }

  if (currentUid !== uid) {
    throw new Error('Authenticated Supabase uid does not match requested payment owner uid.');
  }

  cloudInfo('SUPABASE_RPC_START', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: currentUid,
    requestedUid: uid,
    path,
    operation: 'edit_payment_with_ledger_reversal',
    invoiceId: payment?.invoiceId || null,
  });

  try {
    const { data, error } = await withCloudTimeout(
      client.rpc('edit_payment_with_ledger_reversal', {
        p_payment: {
          ...payment,
          userId: uid,
          ownerUid: uid,
        },
        p_ledger_posting: {
          ...(ledgerPosting || {}),
          userId: uid,
          ownerUid: uid,
        },
      }),
      { path, uid, currentSupabaseUserUid: currentUid, operation: 'rpc:edit_payment_with_ledger_reversal' }
    );

    if (error) {
      throw error;
    }

    if (!data?.payment || !data?.ledgerPosting) {
      const rpcError = new Error('Atomic payment edit RPC did not return both payment and replacement ledger posting.');
      rpcError.code = 'supabase/rpc-verification-failed';
      throw rpcError;
    }

    cloudInfo('SUPABASE_RPC_SUCCESS', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      path,
      operation: 'edit_payment_with_ledger_reversal',
      transactionId: data.ledgerPosting?.id || null,
      auditLogId: data.auditLogId || null,
    });

    return data;
  } catch (error) {
    cloudError('SUPABASE_RPC_ERROR', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      path,
      operation: 'edit_payment_with_ledger_reversal',
      code: error?.code || null,
      message: error?.message || '',
    });
    throw error;
  }
}

export async function deletePaymentWithLedgerReversal(uid, paymentId) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const currentUid = user?.id || null;
  const path = uid && paymentId ? pathFor(uid, 'payments', paymentId) : null;

  if (!client || !uid || !paymentId) {
    throw new Error('Missing Supabase client, uid, or payment id for atomic payment delete.');
  }

  if (!currentUid) {
    throw new Error('No authenticated Supabase user is available for atomic payment delete.');
  }

  if (currentUid !== uid) {
    throw new Error('Authenticated Supabase uid does not match requested payment owner uid.');
  }

  cloudInfo('SUPABASE_RPC_START', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: currentUid,
    requestedUid: uid,
    path,
    operation: 'delete_payment_with_ledger_reversal',
  });

  try {
    const { data, error } = await withCloudTimeout(
      client.rpc('delete_payment_with_ledger_reversal', {
        p_payment_id: paymentId,
      }),
      { path, uid, currentSupabaseUserUid: currentUid, operation: 'rpc:delete_payment_with_ledger_reversal' }
    );

    if (error) {
      throw error;
    }

    if (!data?.payment || !data?.cancelledLedgerPosting) {
      const rpcError = new Error('Atomic payment delete RPC did not return both payment and cancelled ledger posting.');
      rpcError.code = 'supabase/rpc-verification-failed';
      throw rpcError;
    }

    cloudInfo('SUPABASE_RPC_SUCCESS', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      path,
      operation: 'delete_payment_with_ledger_reversal',
      transactionId: data.cancelledLedgerPosting?.id || null,
      auditLogId: data.auditLogId || null,
    });

    return data;
  } catch (error) {
    cloudError('SUPABASE_RPC_ERROR', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      path,
      operation: 'delete_payment_with_ledger_reversal',
      code: error?.code || null,
      message: error?.message || '',
    });
    throw error;
  }
}

export async function saveCloudRecord(uid, tableName, id, data) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const allowed = CLOUD_TABLES.has(tableName);
  const path = uid && tableName && id ? pathFor(uid, tableName, id) : null;

  if (!client || !uid || !tableName || !id || !allowed) {
    const error = new Error(!client
      ? 'Supabase is not configured or could not initialize.'
      : !allowed
        ? 'Table is not allowed for cloud writes.'
        : 'Missing uid, table name, or document id.');
    cloudError('SUPABASE_WRITE_ERROR', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: user?.id || null,
      requestedUid: uid || null,
      collectionName: tableName,
      documentId: id,
      path,
      code: error.code || null,
      message: error.message,
    });
    throw error;
  }

  const currentUid = user?.id || null;
  if (!currentUid) {
    const error = new Error('No authenticated Supabase user is available for database write.');
    cloudError('SUPABASE_WRITE_ERROR', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: null,
      requestedUid: uid,
      collectionName: tableName,
      documentId: id,
      path,
      code: error.code || null,
      message: error.message,
    });
    throw error;
  }

  if (currentUid !== uid) {
    const error = new Error('Authenticated Supabase uid does not match requested database owner uid.');
    cloudError('SUPABASE_WRITE_ERROR', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      collectionName: tableName,
      documentId: id,
      path,
      code: error.code || null,
      message: error.message,
    });
    throw error;
  }

  const row = buildRow(uid, id, data);
  cloudInfo('SUPABASE_PATH_USED', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: currentUid,
    requestedUid: uid,
    collectionName: tableName,
    documentId: id,
    path,
  });
  cloudInfo('SUPABASE_WRITE_START', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: currentUid,
    requestedUid: uid,
    path,
    operation: 'upsert',
    payload: row.data,
  });

  try {
    console.log(`[DEBUG_SUPABASE] [saveCloudRecord] Saving to table: ${tableName}`);
    console.log(`[DEBUG_SUPABASE] [saveCloudRecord] Payload:`, row.data);

    const { error } = await withCloudTimeout(
      client.from(tableName).upsert(row, { onConflict: 'user_id,id' }),
      { path, uid, currentSupabaseUserUid: currentUid, operation: `upsert:${tableName}` }
    );
    if (error) {
      console.error(`[DEBUG_SUPABASE] [saveCloudRecord] ERROR:`, error);
      throw error;
    }

    const { data: savedRow, error: verifyError } = await withCloudTimeout(
      client.from(tableName).select('*').eq('user_id', uid).eq('id', id).single(),
      { path, uid, currentSupabaseUserUid: currentUid, operation: `select:${tableName}:verify` }
    );
    if (verifyError) {
      console.error(`[DEBUG_SUPABASE] [saveCloudRecord] VERIFY ERROR:`, verifyError);
      throw verifyError;
    }

    console.log(`[DEBUG_SUPABASE] [saveCloudRecord] SUCCESS. Response row:`, savedRow);
    if (!savedRow) {
      const error = new Error(`Supabase write verification failed: row not found at ${path}`);
      error.code = 'supabase/verification-failed';
      throw error;
    }

    cloudInfo('SUPABASE_WRITE_SUCCESS', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      path,
      operation: 'upsert',
      verified: true,
    });
    return true;
  } catch (error) {
    cloudError('SUPABASE_WRITE_ERROR', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      collectionName: tableName,
      documentId: id,
      path,
      code: error?.code || null,
      message: error?.message || String(error),
    });
    throw error;
  }
}

export async function deleteCloudRecord(uid, tableName, id) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !uid || !tableName || !id || !CLOUD_TABLES.has(tableName)) {
    return false;
  }

  const path = pathFor(uid, tableName, id);
  cloudInfo('[Supabase delete start]', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: user?.id || null,
    requestedUid: uid,
    path,
  });

  const { error } = await withCloudTimeout(
    client.from(tableName).delete().eq('user_id', uid).eq('id', id),
    { path, uid, currentSupabaseUserUid: user?.id || null, operation: `delete:${tableName}` }
  );
  if (error) throw error;

  cloudInfo('[Supabase delete success]', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: user?.id || null,
    requestedUid: uid,
    path,
  });
  return true;
}

function safeStorageSegment(value, fallback = 'file') {
  return String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || fallback;
}

export function buildHrmsStoragePath({ uid, businessId = 'default', employeeId, category = 'documents', fileName }) {
  return [
    safeStorageSegment(uid, 'user'),
    safeStorageSegment(businessId, 'default'),
    safeStorageSegment(employeeId, 'employee'),
    safeStorageSegment(category, 'documents'),
    `${Date.now()}-${safeStorageSegment(fileName, 'document')}`,
  ].join('/');
}

export async function uploadHrmsDocument({ uid, path, file }) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !uid || !path || !file) {
    throw new Error('Missing Supabase upload details.');
  }
  if (user?.id !== uid) {
    throw new Error('Authenticated Supabase uid does not match requested storage owner uid.');
  }

  const { error } = await withCloudTimeout(
    client.storage.from(HRMS_DOCUMENT_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    }),
    { path: `${HRMS_DOCUMENT_BUCKET}/${path}`, uid, currentSupabaseUserUid: user?.id || null, operation: 'storage:upload' }
  );
  if (error) throw error;
  return { bucket: HRMS_DOCUMENT_BUCKET, path };
}

export async function deleteHrmsDocument({ uid, path }) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !uid || !path) {
    return false;
  }
  if (user?.id !== uid) {
    throw new Error('Authenticated Supabase uid does not match requested storage owner uid.');
  }
  const { error } = await withCloudTimeout(
    client.storage.from(HRMS_DOCUMENT_BUCKET).remove([path]),
    { path: `${HRMS_DOCUMENT_BUCKET}/${path}`, uid, currentSupabaseUserUid: user?.id || null, operation: 'storage:delete' }
  );
  if (error) throw error;
  return true;
}

export async function createHrmsDocumentSignedUrl({ uid, path, expiresIn = 300 }) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !uid || !path) {
    throw new Error('Missing Supabase download details.');
  }
  const { data, error } = await withCloudTimeout(
    client.storage.from(HRMS_DOCUMENT_BUCKET).createSignedUrl(path, expiresIn),
    { path: `${HRMS_DOCUMENT_BUCKET}/${path}`, uid, currentSupabaseUserUid: user?.id || null, operation: 'storage:signed-url' }
  );
  if (error) throw error;
  return data?.signedUrl || '';
}

export async function saveEmployeeSelfServiceRecord(ownerUid, tableName, id, data) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const allowed = ['leave_requests'].includes(tableName);
  if (!client || !ownerUid || !id || !allowed || !user?.id) {
    throw new Error('Employee self-service save is not allowed for this record.');
  }
  const row = buildRow(ownerUid, id, data);
  const path = pathFor(ownerUid, tableName, id);
  const { error } = await withCloudTimeout(
    client.from(tableName).upsert(row, { onConflict: 'user_id,id' }),
    { path, uid: ownerUid, currentSupabaseUserUid: user.id, operation: `employee-upsert:${tableName}` }
  );
  if (error) throw error;
  return true;
}

export async function loadCloudCollection(uid, tableName) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !uid || !CLOUD_TABLES.has(tableName)) {
    return [];
  }

  const path = pathFor(uid, tableName);
  cloudInfo('SUPABASE_LOAD_START', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: user?.id || null,
    requestedUid: uid,
    tableName,
    path,
  });

  let data;
  let error;
  try {
    const result = await withCloudTimeout(
      client.from(tableName).select('*').eq('user_id', uid).order('updated_at', { ascending: false }),
      { path, uid, currentSupabaseUserUid: user?.id || null, operation: `select:${tableName}` }
    );
    data = result.data;
    error = result.error;
  } catch (caughtError) {
    cloudError('SUPABASE_LOAD_ERROR', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: user?.id || null,
      requestedUid: uid,
      tableName,
      path,
      code: caughtError?.code || null,
      message: caughtError?.message || String(caughtError),
    });
    throw caughtError;
  }
  if (error) {
    cloudError('SUPABASE_LOAD_ERROR', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: user?.id || null,
      requestedUid: uid,
      tableName,
      path,
      code: error?.code || null,
      message: error?.message || String(error),
    });
    throw error;
  }

  cloudInfo('SUPABASE_LOAD_SUCCESS', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: user?.id || null,
    requestedUid: uid,
    tableName,
    path,
    count: (data || []).length,
  });

  return (data || []).map((row) => rowToAppRecord(row, tableName)).filter(Boolean);
}

function normalizeCompanyMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    businessId: row.business_id || 'default',
    userId: row.user_id || '',
    name: row.display_name || row.member_name || '',
    email: row.invited_email || row.member_email || '',
    role: row.role || 'staff',
    status: row.status || 'invited',
    invitedAt: row.invited_at || '',
    joinedAt: row.joined_at || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export async function loadCompanyMembers(uid, businessId = 'default') {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const currentUid = user?.id || null;
  const path = `company_members/${uid}/${businessId}`;

  if (!client || !uid) {
    return [];
  }

  cloudInfo('SUPABASE_MEMBERS_LOAD_START', {
    projectId: getSupabaseProjectHost() || null,
    authDomain: supabaseConfig.url || null,
    currentSupabaseUserUid: currentUid,
    requestedUid: uid,
    path,
  });

  try {
    const { data, error } = await withCloudTimeout(
      client
        .from('company_members')
        .select('id, owner_user_id, business_id, user_id, display_name, invited_email, role, status, invited_at, joined_at, created_at, updated_at')
        .eq('owner_user_id', uid)
        .eq('business_id', businessId)
        .order('updated_at', { ascending: false }),
      { path, uid, currentSupabaseUserUid: currentUid, operation: 'select:company_members' }
    );
    if (error) throw error;
    cloudInfo('SUPABASE_MEMBERS_LOAD_SUCCESS', {
      projectId: getSupabaseProjectHost() || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      count: (data || []).length,
      path,
    });
    return (data || []).map(normalizeCompanyMember).filter(Boolean);
  } catch (error) {
    cloudError('SUPABASE_MEMBERS_LOAD_ERROR', {
      projectId: getSupabaseProjectHost() || null,
      authDomain: supabaseConfig.url || null,
      currentSupabaseUserUid: currentUid,
      requestedUid: uid,
      path,
      code: error?.code || null,
      message: error?.message || String(error),
    });
    throw error;
  }
}

export async function inviteCompanyMember(uid, member) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const currentUid = user?.id || null;
  const path = `company_members/${uid}/${member?.businessId || 'default'}`;

  if (!client || !uid || !member?.email) {
    throw new Error('Missing Supabase client, owner uid, or member email for invite.');
  }
  if (currentUid !== uid) {
    throw new Error('Only the company owner can invite members.');
  }

  const { data, error } = await withCloudTimeout(
    client.rpc('invite_company_member', {
      p_owner_user_id: uid,
      p_business_id: member.businessId || 'default',
      p_email: sanitizeEmail(member.email),
      p_name: sanitizeText(member.name || ''),
      p_role: member.role || 'staff',
    }),
    { path, uid, currentSupabaseUserUid: currentUid, operation: 'rpc:invite_company_member' }
  );
  if (error) throw error;
  return normalizeCompanyMember(data?.member || data);
}

export async function updateCompanyMember(uid, memberId, updates) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const currentUid = user?.id || null;
  const path = `company_members/${uid}/${memberId}`;

  if (!client || !uid || !memberId) {
    throw new Error('Missing Supabase client, owner uid, or member id for update.');
  }
  if (currentUid !== uid) {
    throw new Error('Only the company owner can update members.');
  }

  const { data, error } = await withCloudTimeout(
    client.rpc('update_company_member', {
      p_member_id: memberId,
      p_role: updates?.role || null,
      p_status: updates?.status || null,
      p_name: updates?.name ? sanitizeText(updates.name) : null,
    }),
    { path, uid, currentSupabaseUserUid: currentUid, operation: 'rpc:update_company_member' }
  );
  if (error) throw error;
  return normalizeCompanyMember(data?.member || data);
}

export async function removeCompanyMember(uid, memberId) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const currentUid = user?.id || null;
  const path = `company_members/${uid}/${memberId}`;

  if (!client || !uid || !memberId) {
    throw new Error('Missing Supabase client, owner uid, or member id for removal.');
  }
  if (currentUid !== uid) {
    throw new Error('Only the company owner can remove members.');
  }

  const { data, error } = await withCloudTimeout(
    client.rpc('remove_company_member', {
      p_member_id: memberId,
    }),
    { path, uid, currentSupabaseUserUid: currentUid, operation: 'rpc:remove_company_member' }
  );
  if (error) throw error;
  return data;
}

function normalizeEmployeeMapping(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    businessId: row.business_id || 'default',
    userId: row.user_id,
    employeeId: row.employee_id,
    employeeEmail: sanitizeEmail(row.employee_email || ''),
    status: row.status || 'active',
    invitedAt: row.invited_at || '',
    linkedAt: row.linked_at || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export async function loadCurrentEmployeeMapping() {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !user?.id) return null;

  const { data, error } = await withCloudTimeout(
    client
      .from('employee_user_mappings')
      .select('id, owner_user_id, business_id, user_id, employee_id, employee_email, status, invited_at, linked_at, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    { path: `employee_user_mappings/current/${user.id}`, uid: user.id, currentSupabaseUserUid: user.id, operation: 'select:employee_user_mappings:current' }
  );
  if (error) throw error;
  return normalizeEmployeeMapping(data);
}

export async function loadEmployeeUserMappings(uid, businessId = 'default') {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !uid || user?.id !== uid) return [];
  const { data, error } = await withCloudTimeout(
    client
      .from('employee_user_mappings')
      .select('id, owner_user_id, business_id, user_id, employee_id, employee_email, status, invited_at, linked_at, created_at, updated_at')
      .eq('owner_user_id', uid)
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false }),
    { path: `employee_user_mappings/${uid}/${businessId}`, uid, currentSupabaseUserUid: user?.id || null, operation: 'select:employee_user_mappings' }
  );
  if (error) throw error;
  return (data || []).map(normalizeEmployeeMapping).filter(Boolean);
}

export async function linkEmployeeUserMapping(uid, mapping) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !uid || user?.id !== uid) {
    throw new Error('Only the company owner can link employee users.');
  }
  const { data, error } = await withCloudTimeout(
    client.rpc('link_employee_user_by_email', {
      p_owner_user_id: uid,
      p_business_id: mapping.businessId || 'default',
      p_employee_id: mapping.employeeId,
      p_employee_email: sanitizeEmail(mapping.email),
    }),
    { path: `employee_user_mappings/${uid}/${mapping.employeeId}`, uid, currentSupabaseUserUid: user?.id || null, operation: 'rpc:link_employee_user_by_email' }
  );
  if (error) throw error;
  return normalizeEmployeeMapping(data?.mapping || data);
}

export async function logEmployeeSelfServiceEvent(uid, event) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !uid || !user?.id) return false;
  const { error } = await withCloudTimeout(
    client.rpc('log_employee_self_service_event', {
      p_owner_user_id: uid,
      p_business_id: event.businessId || 'default',
      p_employee_id: event.employeeId,
      p_action: event.action,
      p_module: event.module || 'Employee Self Service',
      p_record_id: event.recordId || null,
      p_metadata: event.metadata || {},
    }),
    { path: `employee_user_mappings/${uid}/${event.employeeId}/audit`, uid, currentSupabaseUserUid: user.id, operation: 'rpc:log_employee_self_service_event' }
  );
  if (error) throw error;
  return true;
}

export async function saveUserProfileSettings(uid, profile) {
  return saveCloudRecord(uid, 'settings', 'profile', profile);
}

export async function loadUserProfileSettings(uid) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !uid) {
    return null;
  }

  const path = pathFor(uid, 'settings', 'profile');
  const { data, error } = await withCloudTimeout(
    client.from('settings').select('*').eq('user_id', uid).eq('id', 'profile').maybeSingle(),
    { path, uid, currentSupabaseUserUid: user?.id || null, operation: 'select:settings:profile' }
  );
  if (error) throw error;
  return rowToAppRecord(data, 'settings');
}





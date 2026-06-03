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
  'payments',
  'audit_logs',
  'subscriptions',
  'security_settings',
  'devices',
  'offline_queue',
  'reports',
  'settings',
]);

const CLOUD_TIMEOUT_MS = 10_000;
const CLOUD_TIMEOUT_MESSAGE = 'Supabase write timed out. Please check Supabase project, RLS policies, API keys, or env variables.';

let supabaseClient;
let projectLogged = false;

export function isFirebaseConfigured() {
  return Boolean(getSupabaseConfigError() === '');
}

export function getFirebaseProjectId() {
  try {
    return supabaseConfig.url ? new URL(supabaseConfig.url).hostname : '';
  } catch {
    return supabaseConfig.url || '';
  }
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

function getSupabaseClient() {
  const configError = getSupabaseConfigError();
  if (configError) {
    if (!supabaseConfig.url && !supabaseConfig.anonKey) {
      return null;
    }
    const error = new Error(configError);
    error.code = 'supabase/config-invalid';
    throw error;
  }

  if (!isFirebaseConfigured()) {
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
    console.info('SUPABASE_PROJECT', {
      url: supabaseConfig.url || null,
      host: getFirebaseProjectId() || null,
    });
    projectLogged = true;
  }

  return supabaseClient;
}

function normalizeFirebaseEmail(email) {
  return sanitizeEmail(email).toLowerCase().trim();
}

function cloudTimeoutError(meta) {
  const error = new Error(CLOUD_TIMEOUT_MESSAGE);
  error.code = 'supabase/write-timeout';
  console.error('FIRESTORE_WRITE_TIMEOUT', {
    projectId: getFirebaseProjectId() || null,
    authDomain: supabaseConfig.url || null,
    currentFirebaseUserUid: meta.currentFirebaseUserUid || null,
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
    loginAt: new Date().toISOString(),
  };
}

function rowToAppRecord(row) {
  if (!row) {
    return null;
  }
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  return {
    ...data,
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
  if (message.includes('password')) return 'auth/weak-password';
  if (message.includes('invalid email')) return 'auth/invalid-email';
  return code || 'auth/error';
}

export function getFirebaseAuthErrorMessage(error, fallback = 'Authentication failed. Please try again.') {
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
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your internet.',
    'auth/popup-closed-by-user': 'Google login was closed before completion.',
    'auth/requires-recent-login': 'Please login again before doing this action.',
    'auth/email-not-verified': 'Please verify your email before logging in.',
  };

  if (message.includes('invalid login credentials')) {
    return messages['auth/invalid-credential'];
  }

  if (message.includes('invalid api key') || message.includes('jwt')) {
    return 'Supabase anon key is invalid. Copy the anon public key from Supabase Project Settings > API and redeploy Vercel.';
  }

  if (message.includes('failed to fetch') || message.includes('networkerror')) {
    return 'Could not reach Supabase. Check VITE_SUPABASE_URL, Vercel deployment env vars, and internet connection.';
  }

  return messages[code] || fallback;
}

export async function createFirebaseAccount({ email, password, ownerName, businessName }) {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const normalizedEmail = normalizeFirebaseEmail(email);
  console.info('[Supabase auth register start]', { email: normalizedEmail });
  const { data, error } = await client.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        ownerName: sanitizeText(ownerName || 'Business Owner', 120),
        businessName: sanitizeText(businessName || 'Voice Business Tracker', 140),
        role: 'Owner',
      },
    },
  });

  if (error) {
    error.code = mapAuthError(error);
    throw error;
  }

  const user = data?.user;
  if (!user) {
    throw new Error('Supabase did not return a registered user.');
  }

  console.info('REGISTER_SUCCESS', { uid: user.id });
  console.info('EMAIL_VERIFICATION_SENT', { uid: user.id, email: normalizedEmail });
  const payload = userPayload(user, { email: normalizedEmail, ownerName, businessName });
  if (data?.session) {
    await saveUserProfile(payload.uid, payload);
  }
  console.info('[Supabase auth register success]', { uid: payload.uid, email: payload.email });
  return payload;
}

export async function signInFirebaseAccount({ email, password }) {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const normalizedEmail = normalizeFirebaseEmail(email);
  console.info('[Supabase auth login start]', { email: normalizedEmail });
  const { data, error } = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    error.code = mapAuthError(error);
    throw error;
  }

  const user = data?.user;
  if (!user) {
    throw new Error('Supabase did not return a logged-in user.');
  }

  const payload = userPayload(user, { email: normalizedEmail });
  await saveUserProfile(payload.uid, payload);
  console.info('LOGIN_SUCCESS', { uid: payload.uid, emailVerified: payload.emailVerified });
  console.info('[Supabase auth login success]', { uid: payload.uid, email: payload.email });
  return payload;
}

export async function signInFirebaseGoogle() {
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

export async function sendCurrentUserEmailVerification() {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !user?.email) {
    return false;
  }

  const { error } = await client.auth.resend({
    type: 'signup',
    email: normalizeFirebaseEmail(user.email),
  });
  if (error) {
    error.code = mapAuthError(error);
    throw error;
  }
  console.info('EMAIL_VERIFICATION_SENT', { uid: user.id, email: normalizeFirebaseEmail(user.email) });
  return true;
}

export async function reloadCurrentFirebaseUser() {
  const user = await getCurrentSupabaseUser();
  return user ? userPayload(user) : null;
}

export async function sendFirebasePasswordReset(email) {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  const normalizedEmail = normalizeFirebaseEmail(email);
  console.info('PASSWORD_RESET_START', { email: normalizedEmail });
  const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
  });

  if (error) {
    console.error('PASSWORD_RESET_ERROR', {
      code: mapAuthError(error),
      message: error?.message || '',
    });
    error.code = mapAuthError(error);
    throw error;
  }

  console.info('PASSWORD_RESET_SUCCESS', { email: normalizedEmail });
  return true;
}

export async function runFirestoreDebugTest() {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  const uid = user?.id;
  const path = uid ? pathFor(uid, 'debug_tests', 'test') : null;

  console.info('DEBUG_FIRESTORE_TEST_START', {
    uid: uid || null,
    path,
    projectId: getFirebaseProjectId() || null,
    authDomain: supabaseConfig.url || null,
  });

  try {
    if (!client || !user || !uid) {
      throw new Error('No authenticated Supabase user is available for database debug test.');
    }

    const row = {
      id: 'test',
      user_id: uid,
      message: 'hello firestore',
      created_at: new Date().toISOString(),
    };
    await withCloudTimeout(
      client.from('debug_tests').upsert(row, { onConflict: 'user_id,id' }),
      { path, uid, currentFirebaseUserUid: uid, operation: 'upsert:debugTest' }
    ).then(({ error }) => {
      if (error) throw error;
    });

    const { data, error } = await withCloudTimeout(
      client.from('debug_tests').select('*').eq('user_id', uid).eq('id', 'test').single(),
      { path, uid, currentFirebaseUserUid: uid, operation: 'select:debugTestVerify' }
    );
    if (error) throw error;
    if (!data) {
      const verificationError = new Error(`Supabase debug verification failed: row not found at ${path}`);
      verificationError.code = 'supabase/verification-failed';
      throw verificationError;
    }

    console.info('DEBUG_FIRESTORE_TEST_SUCCESS', {
      uid,
      path,
      projectId: getFirebaseProjectId() || null,
      authDomain: supabaseConfig.url || null,
      verified: true,
    });
    return { ok: true, uid, path };
  } catch (error) {
    if (error?.code === 'supabase/write-timeout') {
      console.error('DEBUG_FIRESTORE_TEST_TIMEOUT', {
        uid: uid || null,
        path,
        projectId: getFirebaseProjectId() || null,
        authDomain: supabaseConfig.url || null,
        code: error?.code || null,
        message: error?.message || String(error),
      });
    }
    console.error('DEBUG_FIRESTORE_TEST_ERROR', error?.code || null, error?.message || String(error), {
      uid: uid || null,
      path,
      projectId: getFirebaseProjectId() || null,
      authDomain: supabaseConfig.url || null,
    });
    throw error;
  }
}

export async function signOutFirebase() {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const user = await getCurrentSupabaseUser(client).catch(() => null);
  console.info('[Supabase auth logout start]', { uid: user?.id || null });
  const { error } = await client.auth.signOut();
  if (error) {
    error.code = mapAuthError(error);
    throw error;
  }
  console.info('[Supabase auth logout success]');
}

export async function listenToFirebaseAuth(onUser, onError) {
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

  client.auth.getSession().then(({ data }) => {
    const user = data?.session?.user;
    onUser(user ? userPayload(user) : null);
  }).catch((error) => {
    if (/session.*missing|auth session missing/i.test(error?.message || '')) {
      onUser(null);
      return;
    }
    onError?.(error);
  });

  const { data } = client.auth.onAuthStateChange((_event, session) => {
    try {
      onUser(session?.user ? userPayload(session.user) : null);
    } catch (error) {
      onError?.(error);
    }
  });

  return () => data?.subscription?.unsubscribe();
}

export async function saveUserProfile(uid, profile) {
  return saveCloudRecord(uid, 'settings', 'profile', profile);
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
    console.error('FIRESTORE_WRITE_ERROR', {
      projectId: getFirebaseProjectId() || null,
      authDomain: supabaseConfig.url || null,
      currentFirebaseUserUid: user?.id || null,
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
    console.error('FIRESTORE_WRITE_ERROR', {
      projectId: getFirebaseProjectId() || null,
      authDomain: supabaseConfig.url || null,
      currentFirebaseUserUid: null,
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
    console.error('FIRESTORE_WRITE_ERROR', {
      projectId: getFirebaseProjectId() || null,
      authDomain: supabaseConfig.url || null,
      currentFirebaseUserUid: currentUid,
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
  console.info('FIRESTORE_PATH_USED', {
    projectId: getFirebaseProjectId() || null,
    authDomain: supabaseConfig.url || null,
    currentFirebaseUserUid: currentUid,
    requestedUid: uid,
    collectionName: tableName,
    documentId: id,
    path,
  });
  console.info('FIRESTORE_WRITE_START', {
    projectId: getFirebaseProjectId() || null,
    authDomain: supabaseConfig.url || null,
    currentFirebaseUserUid: currentUid,
    requestedUid: uid,
    path,
    operation: 'upsert',
    payload: row.data,
  });

  try {
    const { error } = await withCloudTimeout(
      client.from(tableName).upsert(row, { onConflict: 'user_id,id' }),
      { path, uid, currentFirebaseUserUid: currentUid, operation: `upsert:${tableName}` }
    );
    if (error) throw error;

    const { data: savedRow, error: verifyError } = await withCloudTimeout(
      client.from(tableName).select('*').eq('user_id', uid).eq('id', id).single(),
      { path, uid, currentFirebaseUserUid: currentUid, operation: `select:${tableName}:verify` }
    );
    if (verifyError) throw verifyError;
    if (!savedRow) {
      const error = new Error(`Supabase write verification failed: row not found at ${path}`);
      error.code = 'supabase/verification-failed';
      throw error;
    }

    console.info('FIRESTORE_WRITE_SUCCESS', {
      projectId: getFirebaseProjectId() || null,
      authDomain: supabaseConfig.url || null,
      currentFirebaseUserUid: currentUid,
      requestedUid: uid,
      path,
      operation: 'upsert',
      verified: true,
    });
    return true;
  } catch (error) {
    console.error('FIRESTORE_WRITE_ERROR', {
      projectId: getFirebaseProjectId() || null,
      authDomain: supabaseConfig.url || null,
      currentFirebaseUserUid: currentUid,
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
  console.info('[Supabase delete start]', {
    projectId: getFirebaseProjectId() || null,
    authDomain: supabaseConfig.url || null,
    currentFirebaseUserUid: user?.id || null,
    requestedUid: uid,
    path,
  });

  const { error } = await withCloudTimeout(
    client.from(tableName).delete().eq('user_id', uid).eq('id', id),
    { path, uid, currentFirebaseUserUid: user?.id || null, operation: `delete:${tableName}` }
  );
  if (error) throw error;

  console.info('[Supabase delete success]', {
    projectId: getFirebaseProjectId() || null,
    authDomain: supabaseConfig.url || null,
    currentFirebaseUserUid: user?.id || null,
    requestedUid: uid,
    path,
  });
  return true;
}

export async function loadCloudCollection(uid, tableName) {
  const client = getSupabaseClient();
  const user = await getCurrentSupabaseUser(client);
  if (!client || !uid || !CLOUD_TABLES.has(tableName)) {
    return [];
  }

  const path = pathFor(uid, tableName);
  const { data, error } = await withCloudTimeout(
    client.from(tableName).select('*').eq('user_id', uid).order('updated_at', { ascending: false }),
    { path, uid, currentFirebaseUserUid: user?.id || null, operation: `select:${tableName}` }
  );
  if (error) throw error;

  return (data || []).map(rowToAppRecord).filter(Boolean);
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
    { path, uid, currentFirebaseUserUid: user?.id || null, operation: 'select:settings:profile' }
  );
  if (error) throw error;
  return rowToAppRecord(data);
}

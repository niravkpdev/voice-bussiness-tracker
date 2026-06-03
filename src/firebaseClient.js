import { sanitizeEmail, sanitizeText } from './security.js';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let firebaseModulesPromise;
let firebaseProjectLogged = false;
let firestoreDb;
const CLOUD_COLLECTIONS = new Set([
  'transactions',
  'customers',
  'suppliers',
  'inventory',
  'reports',
  'settings',
]);

const FIRESTORE_TIMEOUT_MS = 10_000;
const FIRESTORE_TIMEOUT_MESSAGE = 'Firestore write timed out. Please check Firebase project, API, rules, or env variables.';

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
}

export function getFirebaseProjectId() {
  return firebaseConfig.projectId || '';
}

async function loadFirebaseModules() {
  if (!firebaseModulesPromise) {
    firebaseModulesPromise = Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]).then(([app, auth, firestore]) => ({ app, auth, firestore }));
  }

  return firebaseModulesPromise;
}

async function getFirebaseContext() {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const modules = await loadFirebaseModules();
  const app = modules.app.getApps().length ? modules.app.getApp() : modules.app.initializeApp(firebaseConfig);

  const auth = modules.auth.getAuth(app);
  const db = getConfiguredFirestore(modules, app);

  if (!firebaseProjectLogged) {
    console.info('FIREBASE_PROJECT_ID', { projectId: firebaseConfig.projectId || null });
    firebaseProjectLogged = true;
  }

  return { ...modules, appInstance: app, authInstance: auth, db };
}

function getConfiguredFirestore(modules, app) {
  if (firestoreDb) {
    return firestoreDb;
  }

  try {
    firestoreDb = modules.firestore.initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false,
      ignoreUndefinedProperties: true,
    });
    console.info('FIRESTORE_TRANSPORT_MODE', {
      mode: 'force-long-polling',
      useFetchStreams: false,
    });
  } catch (error) {
    firestoreDb = modules.firestore.getFirestore(app);
    console.info('FIRESTORE_TRANSPORT_MODE', {
      mode: 'existing-firestore-instance',
      code: error?.code || null,
      message: error?.message || String(error),
    });
  }

  return firestoreDb;
}

function firestoreTimeoutError(meta) {
  const error = new Error(FIRESTORE_TIMEOUT_MESSAGE);
  error.code = 'firestore/write-timeout';
  console.error('FIRESTORE_WRITE_TIMEOUT', {
    path: meta.path,
    uid: meta.uid,
    projectId: firebaseConfig.projectId || null,
    authDomain: firebaseConfig.authDomain || null,
    currentFirebaseUserUid: meta.currentFirebaseUserUid || null,
    requestedUid: meta.uid || null,
    operation: meta.operation,
  });
  return error;
}

function withFirestoreTimeout(promise, meta) {
  let timer;
  const timeout = new Promise((_, reject) => {
    const setTimer = typeof window !== 'undefined' ? window.setTimeout : setTimeout;
    timer = setTimer(() => {
      reject(firestoreTimeoutError(meta));
    }, FIRESTORE_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    const clearTimer = typeof window !== 'undefined' ? window.clearTimeout : clearTimeout;
    clearTimer(timer);
  });
}

function isFirestoreTimeout(error) {
  return error?.code === 'firestore/write-timeout';
}

function firestoreLogBase(context, uid, path) {
  return {
    projectId: firebaseConfig.projectId || null,
    authDomain: firebaseConfig.authDomain || null,
    currentFirebaseUserUid: context?.authInstance?.currentUser?.uid || null,
    requestedUid: uid || null,
    path,
  };
}

async function verifyFirestoreDocument(context, uid, path, docRef, operation = 'getDoc:verifyRecord') {
  const snapshot = await withFirestoreTimeout(
    context.firestore.getDoc(docRef),
    { path, uid, currentFirebaseUserUid: context.authInstance.currentUser?.uid || null, operation }
  );

  if (!snapshot.exists()) {
    const error = new Error(`Firestore write verification failed: document not found at ${path}`);
    error.code = 'firestore/verification-failed';
    throw error;
  }

  return snapshot;
}

function encodeFirestoreValue(value) {
  if (value === null) {
    return { nullValue: null };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value
          .filter((item) => item !== undefined)
          .map((item) => encodeFirestoreValue(item)),
      },
    };
  }

  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: encodeFirestoreFields(value),
      },
    };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value) && Number.isSafeInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: Number.isFinite(value) ? value : 0 };
  }

  return { stringValue: String(value ?? '') };
}

function encodeFirestoreFields(data) {
  return Object.entries(data || {})
    .filter(([, value]) => value !== undefined)
    .reduce((fields, [key, value]) => {
      fields[key] = encodeFirestoreValue(value);
      return fields;
    }, {});
}

function firestoreDocumentName(path) {
  const encodedPath = String(path)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `projects/${firebaseConfig.projectId}/databases/(default)/documents/${encodedPath}`;
}

async function commitFirestoreRestWrite(context, path, data, transformFields = []) {
  const user = context?.authInstance?.currentUser;
  if (!user) {
    throw new Error('No authenticated Firebase user is available for Firestore REST write.');
  }

  const transformSet = new Set(transformFields);
  const updateData = Object.entries(data || {}).reduce((cleaned, [key, value]) => {
    if (value !== undefined && !transformSet.has(key)) {
      cleaned[key] = value;
    }
    return cleaned;
  }, {});
  const fieldPaths = Object.keys(updateData);
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:commit`;

  console.info('FIRESTORE_REST_FALLBACK_START', {
    path,
    uid: user.uid,
    projectId: firebaseConfig.projectId || null,
    authDomain: firebaseConfig.authDomain || null,
  });

  const response = await withFirestoreTimeout(
    fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: firestoreDocumentName(path),
              fields: encodeFirestoreFields(updateData),
            },
            ...(fieldPaths.length ? { updateMask: { fieldPaths } } : {}),
            ...(transformFields.length
              ? {
                  updateTransforms: transformFields.map((fieldPath) => ({
                    fieldPath,
                    setToServerValue: 'REQUEST_TIME',
                  })),
                }
              : {}),
          },
        ],
      }),
    }),
    { path, uid: user.uid, currentFirebaseUserUid: user.uid, operation: 'rest:commit' }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    let parsedError = null;
    try {
      parsedError = body ? JSON.parse(body) : null;
    } catch {
      parsedError = null;
    }
    const googleError = parsedError?.error || {};
    const reason = googleError.details?.find((detail) => detail?.reason)?.reason || '';
    const code = reason === 'CONSUMER_INVALID'
      ? 'firestore/consumer-invalid'
      : `firestore/rest-${response.status}`;
    const message = reason === 'CONSUMER_INVALID'
      ? `Cloud Firestore API is not enabled or project id is wrong for Firebase project "${firebaseConfig.projectId}". Enable firestore.googleapis.com and confirm Vercel Firebase env variables.`
      : googleError.message || body || `Firestore REST write failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.code = code;
    error.googleStatus = googleError.status || null;
    error.googleReason = reason || null;
    console.error('FIRESTORE_REST_FALLBACK_ERROR', {
      path,
      uid: user.uid,
      projectId: firebaseConfig.projectId || null,
      authDomain: firebaseConfig.authDomain || null,
      code: error.code,
      message: error.message,
      googleStatus: error.googleStatus,
      googleReason: error.googleReason,
    });
    throw error;
  }

  console.info('FIRESTORE_REST_FALLBACK_SUCCESS', {
    path,
    uid: user.uid,
    projectId: firebaseConfig.projectId || null,
    authDomain: firebaseConfig.authDomain || null,
  });
  return true;
}

function userPayload(user, extra = {}) {
  return {
    uid: user.uid,
    email: sanitizeEmail(user.email || extra.email || ''),
    ownerName: sanitizeText(user.displayName || extra.ownerName || 'Business Owner', 120),
    businessName: sanitizeText(extra.businessName || 'Voice Business Tracker', 140),
    role: extra.role || 'Owner',
    provider: user.providerData?.[0]?.providerId || extra.provider || 'email',
    emailVerified: Boolean(user.emailVerified),
    loginAt: new Date().toISOString(),
  };
}

function normalizeFirebaseEmail(email) {
  return sanitizeEmail(email).toLowerCase().trim();
}

export function getFirebaseAuthErrorMessage(error, fallback = 'Authentication failed. Please try again.') {
  const code = String(error?.code || '').toLowerCase();
  const messages = {
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
  };

  return messages[code] || fallback;
}

export async function createFirebaseAccount({ email, password, ownerName, businessName }) {
  const context = await getFirebaseContext();
  if (!context) {
    return null;
  }

  const normalizedEmail = normalizeFirebaseEmail(email);
  if (import.meta.env.DEV) {
    console.info('[Firebase auth register start]', { email: normalizedEmail });
  }

  const credential = await context.auth.createUserWithEmailAndPassword(
    context.authInstance,
    normalizedEmail,
    password
  );
  console.info('REGISTER_SUCCESS', { uid: credential.user.uid });
  await context.auth.updateProfile(credential.user, {
    displayName: sanitizeText(ownerName || businessName || 'Business Owner', 120),
  });
  await context.auth.sendEmailVerification(context.authInstance.currentUser || credential.user);
  console.info('EMAIL_VERIFICATION_SENT', { uid: credential.user.uid, email: normalizedEmail });
  await credential.user.reload();

  const currentUser = context.authInstance.currentUser || credential.user;
  const payload = userPayload(currentUser, { email: normalizedEmail, ownerName, businessName });
  await saveUserProfile(payload.uid, payload);
  if (import.meta.env.DEV) {
    console.info('[Firebase auth register success]', { uid: payload.uid, email: payload.email });
  }
  return payload;
}

export async function signInFirebaseAccount({ email, password }) {
  const context = await getFirebaseContext();
  if (!context) {
    return null;
  }

  const normalizedEmail = normalizeFirebaseEmail(email);
  if (import.meta.env.DEV) {
    console.info('[Firebase auth login start]', { email: normalizedEmail });
  }

  const credential = await context.auth.signInWithEmailAndPassword(
    context.authInstance,
    normalizedEmail,
    password
  );
  await credential.user.reload();
  const currentUser = context.authInstance.currentUser || credential.user;
  const payload = userPayload(currentUser, { email: normalizedEmail });
  await saveUserProfile(payload.uid, payload);
  console.info('LOGIN_SUCCESS', { uid: payload.uid, emailVerified: payload.emailVerified });
  if (import.meta.env.DEV) {
    console.info('[Firebase auth login success]', { uid: payload.uid, email: payload.email });
  }
  return payload;
}

export async function signInFirebaseGoogle() {
  const context = await getFirebaseContext();
  if (!context) {
    return null;
  }

  const provider = new context.auth.GoogleAuthProvider();
  const credential = await context.auth.signInWithPopup(context.authInstance, provider);
  const payload = userPayload(credential.user, { provider: 'Google' });
  await saveUserProfile(payload.uid, payload);
  return payload;
}

export async function sendCurrentUserEmailVerification() {
  const context = await getFirebaseContext();
  const user = context?.authInstance?.currentUser;
  if (!context || !user) {
    return false;
  }

  await context.auth.sendEmailVerification(user);
  console.info('EMAIL_VERIFICATION_SENT', { uid: user.uid, email: normalizeFirebaseEmail(user.email || '') });
  return true;
}

export async function reloadCurrentFirebaseUser() {
  const context = await getFirebaseContext();
  const user = context?.authInstance?.currentUser;
  if (!context || !user) {
    return null;
  }

  await user.reload();
  const currentUser = context.authInstance.currentUser || user;
  return userPayload(currentUser);
}

export async function sendFirebasePasswordReset(email) {
  const context = await getFirebaseContext();
  if (!context) {
    return false;
  }

  const normalizedEmail = normalizeFirebaseEmail(email);
  if (import.meta.env.DEV) {
    console.info('PASSWORD_RESET_START', { email: normalizedEmail });
  }

  try {
    await context.auth.sendPasswordResetEmail(context.authInstance, normalizedEmail);
    if (import.meta.env.DEV) {
      console.info('PASSWORD_RESET_SUCCESS', { email: normalizedEmail });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('PASSWORD_RESET_ERROR', {
        code: error?.code || null,
        message: error?.message || '',
      });
    }
    throw error;
  }
  return true;
}

export async function runFirestoreDebugTest() {
  const context = await getFirebaseContext();
  const user = context?.authInstance?.currentUser;
  const uid = user?.uid;
  const path = uid ? `users/${uid}/debug/test` : null;

  console.info('DEBUG_FIRESTORE_TEST_START', {
    uid: uid || null,
    path,
    projectId: firebaseConfig.projectId || null,
    authDomain: firebaseConfig.authDomain || null,
  });

  try {
    if (!context || !user || !uid) {
      throw new Error('No authenticated Firebase user is available for Firestore debug test.');
    }

    const docRef = context.firestore.doc(context.db, 'users', uid, 'debug', 'test');
    try {
      await withFirestoreTimeout(
        context.firestore.setDoc(
          docRef,
          {
            message: 'hello firestore',
            createdAt: context.firestore.serverTimestamp(),
          }
        ),
        { path, uid, currentFirebaseUserUid: uid, operation: 'setDoc:debugTest' }
      );
    } catch (error) {
      if (!isFirestoreTimeout(error)) {
        throw error;
      }
      await commitFirestoreRestWrite(context, path, { message: 'hello firestore' }, ['createdAt']);
    }

    await verifyFirestoreDocument(context, uid, path, docRef, 'getDoc:debugTestVerify');

    console.info('DEBUG_FIRESTORE_TEST_SUCCESS', {
      uid,
      path,
      projectId: firebaseConfig.projectId || null,
      authDomain: firebaseConfig.authDomain || null,
      verified: true,
    });
    return { ok: true, uid, path };
  } catch (error) {
    if (isFirestoreTimeout(error)) {
      console.error('DEBUG_FIRESTORE_TEST_TIMEOUT', {
        uid: uid || null,
        path,
        projectId: firebaseConfig.projectId || null,
        authDomain: firebaseConfig.authDomain || null,
        code: error?.code || null,
        message: error?.message || String(error),
      });
    }
    console.error('DEBUG_FIRESTORE_TEST_ERROR', error?.code || null, error?.message || String(error), {
      uid: uid || null,
      path,
      projectId: firebaseConfig.projectId || null,
      authDomain: firebaseConfig.authDomain || null,
    });
    throw error;
  }
}

export async function signOutFirebase() {
  const context = await getFirebaseContext();
  if (!context) {
    return;
  }

  if (import.meta.env.DEV) {
    console.info('[Firebase auth logout start]', { uid: context.authInstance.currentUser?.uid || null });
  }
  await context.auth.signOut(context.authInstance);
  if (import.meta.env.DEV) {
    console.info('[Firebase auth logout success]');
  }
}

export async function listenToFirebaseAuth(onUser, onError) {
  const context = await getFirebaseContext();
  if (!context) {
    return () => {};
  }

  return context.auth.onAuthStateChanged(
    context.authInstance,
    async (user) => {
      try {
        if (!user) {
          onUser(null);
          return;
        }

        await user.reload();
        onUser(userPayload(context.authInstance.currentUser || user));
      } catch (error) {
        onError?.(error);
      }
    },
    onError
  );
}

export async function saveUserProfile(uid, profile) {
  const context = await getFirebaseContext();
  if (!context || !uid) {
    return false;
  }

  const path = `users/${uid}/settings/profile`;
  try {
    const profilePayload = { ...profile };
    const docRef = context.firestore.doc(context.db, 'users', uid, 'settings', 'profile');
    try {
      await withFirestoreTimeout(
        context.firestore.setDoc(
          docRef,
          {
            ...profilePayload,
            updatedAt: context.firestore.serverTimestamp(),
          },
          { merge: true }
        ),
        { path, uid, currentFirebaseUserUid: context.authInstance.currentUser?.uid || null, operation: 'setDoc:userProfile' }
      );
    } catch (error) {
      if (!isFirestoreTimeout(error)) {
        throw error;
      }
      await commitFirestoreRestWrite(context, path, profilePayload, ['updatedAt']);
    }
    await verifyFirestoreDocument(context, uid, path, docRef, 'getDoc:verifyUserProfile');
    return true;
  } catch (error) {
    console.error('FIRESTORE_WRITE_ERROR', {
      currentFirebaseUserUid: context.authInstance.currentUser?.uid || null,
      requestedUid: uid,
      projectId: firebaseConfig.projectId || null,
      authDomain: firebaseConfig.authDomain || null,
      path,
      code: error?.code || null,
      message: error?.message || String(error),
    });
    throw error;
  }
}

export async function saveCloudRecord(uid, collectionName, id, data) {
  const context = await getFirebaseContext();
  if (!context || !uid || !collectionName || !id || !CLOUD_COLLECTIONS.has(collectionName)) {
    const error = new Error(!context
      ? 'Firebase is not configured or could not initialize.'
      : !CLOUD_COLLECTIONS.has(collectionName)
        ? 'Collection is not allowed for cloud writes.'
        : 'Missing uid, collection name, or document id.');
    console.error('FIRESTORE_WRITE_ERROR', {
      requestedUid: uid || null,
      currentFirebaseUserUid: context?.authInstance?.currentUser?.uid || null,
      projectId: firebaseConfig.projectId || null,
      authDomain: firebaseConfig.authDomain || null,
      collectionName,
      documentId: id,
      path: uid && collectionName && id ? `users/${uid}/${collectionName}/${id}` : null,
      code: error.code || null,
      message: error.message,
    });
    throw error;
  }

  const currentUid = context.authInstance.currentUser?.uid || null;
  if (!currentUid) {
    const error = new Error('No authenticated Firebase user is available for Firestore write.');
    console.error('FIRESTORE_WRITE_ERROR', {
      requestedUid: uid,
      currentFirebaseUserUid: null,
      projectId: firebaseConfig.projectId || null,
      authDomain: firebaseConfig.authDomain || null,
      collectionName,
      documentId: id,
      path: `users/${uid}/${collectionName}/${id}`,
      code: error.code || null,
      message: error.message,
    });
    throw error;
  }

  if (currentUid !== uid) {
    const error = new Error('Authenticated Firebase uid does not match requested Firestore owner uid.');
    console.error('FIRESTORE_WRITE_ERROR', {
      requestedUid: uid,
      currentFirebaseUserUid: currentUid,
      projectId: firebaseConfig.projectId || null,
      authDomain: firebaseConfig.authDomain || null,
      collectionName,
      documentId: id,
      path: `users/${uid}/${collectionName}/${id}`,
      code: error.code || null,
      message: error.message,
    });
    throw error;
  }

  const path = `users/${uid}/${collectionName}/${id}`;
  const payload = {
    ...data,
    ownerUid: uid,
    updatedAt: '[serverTimestamp]',
  };

  console.info('FIRESTORE_PATH_USED', {
    projectId: firebaseConfig.projectId || null,
    authDomain: firebaseConfig.authDomain || null,
    currentFirebaseUserUid: currentUid,
    requestedUid: uid,
    collectionName,
    documentId: id,
    path,
  });

  console.info('FIRESTORE_WRITE_START', {
    currentFirebaseUserUid: currentUid,
    requestedUid: uid,
    projectId: firebaseConfig.projectId || null,
    authDomain: firebaseConfig.authDomain || null,
    path,
    operation: 'setDoc',
    payload,
  });

  try {
    const recordPayload = {
      ...data,
      ownerUid: uid,
    };
    const docRef = context.firestore.doc(context.db, 'users', uid, collectionName, id);
    try {
      await withFirestoreTimeout(
        context.firestore.setDoc(
          docRef,
          {
            ...recordPayload,
            updatedAt: context.firestore.serverTimestamp(),
          },
          { merge: true }
        ),
        { path, uid, currentFirebaseUserUid: currentUid, operation: 'setDoc:record' }
      );
    } catch (error) {
      if (!isFirestoreTimeout(error)) {
        throw error;
      }
      await commitFirestoreRestWrite(context, path, recordPayload, ['updatedAt']);
    }

    await verifyFirestoreDocument(context, uid, path, docRef, 'getDoc:verifyRecord');

    console.info('FIRESTORE_WRITE_SUCCESS', {
      currentFirebaseUserUid: currentUid,
      requestedUid: uid,
      projectId: firebaseConfig.projectId || null,
      authDomain: firebaseConfig.authDomain || null,
      path,
      operation: 'setDoc:record',
      verified: true,
    });
    return true;
  } catch (error) {
    console.error('FIRESTORE_WRITE_ERROR', {
      currentFirebaseUserUid: currentUid,
      requestedUid: uid,
      projectId: firebaseConfig.projectId || null,
      authDomain: firebaseConfig.authDomain || null,
      collectionName,
      documentId: id,
      path,
      code: error?.code || null,
      message: error?.message || String(error),
    });
    throw error;
  }
}

export async function deleteCloudRecord(uid, collectionName, id) {
  const context = await getFirebaseContext();
  if (!context || !uid || !collectionName || !id || !CLOUD_COLLECTIONS.has(collectionName)) {
    console.error('[Firestore delete blocked]', {
      requestedUid: uid || null,
      currentFirebaseUserUid: context?.authInstance?.currentUser?.uid || null,
      projectId: firebaseConfig.projectId || null,
      authDomain: firebaseConfig.authDomain || null,
      collectionName,
      documentId: id,
      path: uid && collectionName && id ? `users/${uid}/${collectionName}/${id}` : null,
    });
    return false;
  }

  const path = `users/${uid}/${collectionName}/${id}`;
  console.info('[Firestore delete start]', {
    currentFirebaseUserUid: context.authInstance.currentUser?.uid || null,
    requestedUid: uid,
    projectId: firebaseConfig.projectId || null,
    authDomain: firebaseConfig.authDomain || null,
    path,
  });

  try {
    await withFirestoreTimeout(
      context.firestore.deleteDoc(
        context.firestore.doc(context.db, 'users', uid, collectionName, id)
      ),
      { path, uid, currentFirebaseUserUid: context.authInstance.currentUser?.uid || null, operation: 'deleteDoc:record' }
    );

    console.info('[Firestore delete success]', {
      currentFirebaseUserUid: context.authInstance.currentUser?.uid || null,
      requestedUid: uid,
      projectId: firebaseConfig.projectId || null,
      authDomain: firebaseConfig.authDomain || null,
      path,
    });
    return true;
  } catch (error) {
    console.error('FIRESTORE_WRITE_ERROR', {
      currentFirebaseUserUid: context.authInstance.currentUser?.uid || null,
      requestedUid: uid,
      projectId: firebaseConfig.projectId || null,
      collectionName,
      documentId: id,
      path,
      code: error?.code || null,
      message: error?.message || String(error),
    });
    throw error;
  }
}

export async function loadCloudCollection(uid, collectionName) {
  const context = await getFirebaseContext();
  if (!context || !uid || !CLOUD_COLLECTIONS.has(collectionName)) {
    return [];
  }

  const snapshot = await withFirestoreTimeout(
    context.firestore.getDocs(
      context.firestore.collection(context.db, 'users', uid, collectionName)
    ),
    {
      path: `users/${uid}/${collectionName}`,
      uid,
      currentFirebaseUserUid: context.authInstance.currentUser?.uid || null,
      operation: 'getDocs:collection',
    }
  );

  return snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));
}

export async function saveUserProfileSettings(uid, profile) {
  return saveCloudRecord(uid, 'settings', 'profile', profile);
}

export async function loadUserProfileSettings(uid) {
  const context = await getFirebaseContext();
  if (!context || !uid) {
    return null;
  }

  const snapshot = await withFirestoreTimeout(
    context.firestore.getDoc(
      context.firestore.doc(context.db, 'users', uid, 'settings', 'profile')
    ),
    {
      path: `users/${uid}/settings/profile`,
      uid,
      currentFirebaseUserUid: context.authInstance.currentUser?.uid || null,
      operation: 'getDoc:userProfileSettings',
    }
  );

  return snapshot.exists() ? snapshot.data() : null;
}

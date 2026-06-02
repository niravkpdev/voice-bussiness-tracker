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

let analyticsStarted = false;
let firebaseModulesPromise;
let appCheckStarted = false;
let firebaseProjectLogged = false;
const CLOUD_COLLECTIONS = new Set([
  'transactions',
  'customers',
  'suppliers',
  'inventory',
  'reports',
  'settings',
]);

const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
const appCheckEnabled = import.meta.env.VITE_FIREBASE_APPCHECK_ENABLED === 'true';
const FIRESTORE_TIMEOUT_MS = 10_000;
const FIRESTORE_TIMEOUT_MESSAGE = 'Firestore write timed out. Check Firebase rules/API permissions.';

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
}

async function loadFirebaseModules() {
  if (!firebaseModulesPromise) {
    firebaseModulesPromise = Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
      import('firebase/analytics'),
      import('firebase/app-check'),
    ]).then(([app, auth, firestore, analytics, appCheck]) => ({ app, auth, firestore, analytics, appCheck }));
  }

  return firebaseModulesPromise;
}

async function getFirebaseContext() {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const modules = await loadFirebaseModules();
  const app = modules.app.getApps().length ? modules.app.getApp() : modules.app.initializeApp(firebaseConfig);

  if (!appCheckStarted && appCheckEnabled && appCheckSiteKey && typeof window !== 'undefined') {
    modules.appCheck.initializeAppCheck(app, {
      provider: new modules.appCheck.ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckStarted = true;
  }

  const auth = modules.auth.getAuth(app);
  const db = modules.firestore.getFirestore(app);

  if (!firebaseProjectLogged) {
    console.info('FIREBASE_PROJECT_ID', { projectId: firebaseConfig.projectId || null });
    firebaseProjectLogged = true;
  }

  if (!analyticsStarted && firebaseConfig.measurementId) {
    modules.analytics.isSupported().then((supported) => {
      if (supported) {
        modules.analytics.getAnalytics(app);
        analyticsStarted = true;
      }
    }).catch(() => {});
  }

  return { ...modules, appInstance: app, authInstance: auth, db };
}

function firestoreTimeoutError(meta) {
  const error = new Error(FIRESTORE_TIMEOUT_MESSAGE);
  error.code = 'firestore/write-timeout';
  console.error('FIRESTORE_WRITE_TIMEOUT', {
    path: meta.path,
    uid: meta.uid,
    projectId: firebaseConfig.projectId || null,
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
  });

  try {
    if (!context || !user || !uid) {
      throw new Error('No authenticated Firebase user is available for Firestore debug test.');
    }

    await withFirestoreTimeout(
      context.firestore.setDoc(
        context.firestore.doc(context.db, 'users', uid, 'debug', 'test'),
        {
          message: 'hello firestore',
          createdAt: context.firestore.serverTimestamp(),
        }
      ),
      { path, uid, operation: 'setDoc:debugTest' }
    );

    console.info('DEBUG_FIRESTORE_TEST_SUCCESS', {
      uid,
      path,
      projectId: firebaseConfig.projectId || null,
    });
    return { ok: true, uid, path };
  } catch (error) {
    console.error('DEBUG_FIRESTORE_TEST_ERROR', error?.code || null, error?.message || String(error), {
      uid: uid || null,
      path,
      projectId: firebaseConfig.projectId || null,
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

  const path = `users/${uid}`;
  try {
    await withFirestoreTimeout(
      context.firestore.setDoc(
        context.firestore.doc(context.db, 'users', uid),
        {
          ...profile,
          updatedAt: context.firestore.serverTimestamp(),
        },
        { merge: true }
      ),
      { path, uid, operation: 'setDoc:userProfile' }
    );
    return true;
  } catch (error) {
    console.error('FIRESTORE_WRITE_ERROR', {
      currentFirebaseUserUid: context.authInstance.currentUser?.uid || null,
      requestedUid: uid,
      projectId: firebaseConfig.projectId || null,
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

  console.info('FIRESTORE_WRITE_START', {
    currentFirebaseUserUid: currentUid,
    requestedUid: uid,
    projectId: firebaseConfig.projectId || null,
    path,
    operation: 'setDoc',
    payload,
  });

  try {
    const docRef = context.firestore.doc(context.db, 'users', uid, collectionName, id);
    await withFirestoreTimeout(
      context.firestore.setDoc(
        docRef,
        {
          ...data,
          ownerUid: uid,
          updatedAt: context.firestore.serverTimestamp(),
        },
        { merge: true }
      ),
      { path, uid, operation: 'setDoc:record' }
    );

    console.info('FIRESTORE_WRITE_SUCCESS', {
      currentFirebaseUserUid: currentUid,
      requestedUid: uid,
      projectId: firebaseConfig.projectId || null,
      path,
      operation: 'setDoc:record',
    });
    return true;
  } catch (error) {
    console.error('FIRESTORE_WRITE_ERROR', {
      currentFirebaseUserUid: currentUid,
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

export async function deleteCloudRecord(uid, collectionName, id) {
  const context = await getFirebaseContext();
  if (!context || !uid || !collectionName || !id || !CLOUD_COLLECTIONS.has(collectionName)) {
    console.error('[Firestore delete blocked]', {
      requestedUid: uid || null,
      currentFirebaseUserUid: context?.authInstance?.currentUser?.uid || null,
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
    path,
  });

  try {
    await withFirestoreTimeout(
      context.firestore.deleteDoc(
        context.firestore.doc(context.db, 'users', uid, collectionName, id)
      ),
      { path, uid, operation: 'deleteDoc:record' }
    );

    console.info('[Firestore delete success]', {
      currentFirebaseUserUid: context.authInstance.currentUser?.uid || null,
      requestedUid: uid,
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
    { path: `users/${uid}/${collectionName}`, uid, operation: 'getDocs:collection' }
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
    { path: `users/${uid}/settings/profile`, uid, operation: 'getDoc:userProfileSettings' }
  );

  return snapshot.exists() ? snapshot.data() : null;
}

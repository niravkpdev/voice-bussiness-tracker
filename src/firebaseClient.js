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
    ]).then(([app, auth, firestore, analytics]) => ({ app, auth, firestore, analytics }));
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
  const db = modules.firestore.getFirestore(app);

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

function userPayload(user, extra = {}) {
  return {
    uid: user.uid,
    email: sanitizeEmail(user.email || extra.email || ''),
    ownerName: sanitizeText(user.displayName || extra.ownerName || 'Business Owner', 120),
    businessName: sanitizeText(extra.businessName || 'Voice Business Tracker', 140),
    role: extra.role || 'Owner',
    provider: user.providerData?.[0]?.providerId || extra.provider || 'email',
    loginAt: new Date().toISOString(),
  };
}

export async function createFirebaseAccount({ email, password, ownerName, businessName }) {
  const context = await getFirebaseContext();
  if (!context) {
    return null;
  }

  const credential = await context.auth.createUserWithEmailAndPassword(
    context.authInstance,
    sanitizeEmail(email),
    password
  );
  await context.auth.updateProfile(credential.user, {
    displayName: sanitizeText(ownerName || businessName || 'Business Owner', 120),
  });

  const payload = userPayload(credential.user, { email, ownerName, businessName });
  await saveUserProfile(payload.uid, payload);
  return payload;
}

export async function signInFirebaseAccount({ email, password }) {
  const context = await getFirebaseContext();
  if (!context) {
    return null;
  }

  const credential = await context.auth.signInWithEmailAndPassword(
    context.authInstance,
    sanitizeEmail(email),
    password
  );
  const payload = userPayload(credential.user, { email });
  await saveUserProfile(payload.uid, payload);
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

export async function signOutFirebase() {
  const context = await getFirebaseContext();
  if (!context) {
    return;
  }

  await context.auth.signOut(context.authInstance);
}

export async function listenToFirebaseAuth(onUser, onError) {
  const context = await getFirebaseContext();
  if (!context) {
    return () => {};
  }

  return context.auth.onAuthStateChanged(
    context.authInstance,
    (user) => onUser(user ? userPayload(user) : null),
    onError
  );
}

export async function saveUserProfile(uid, profile) {
  const context = await getFirebaseContext();
  if (!context || !uid) {
    return false;
  }

  await context.firestore.setDoc(
    context.firestore.doc(context.db, 'users', uid),
    {
      ...profile,
      updatedAt: context.firestore.serverTimestamp(),
    },
    { merge: true }
  );
  return true;
}

export async function saveCloudRecord(uid, collectionName, id, data) {
  const context = await getFirebaseContext();
  if (!context || !uid || !collectionName || !id) {
    return false;
  }

  await context.firestore.setDoc(
    context.firestore.doc(context.db, 'users', uid, collectionName, id),
    {
      ...data,
      ownerUid: uid,
      updatedAt: context.firestore.serverTimestamp(),
    },
    { merge: true }
  );
  return true;
}

export async function saveCloudSnapshot(uid, snapshot) {
  return saveCloudRecord(uid, 'snapshots', 'current', {
    ...snapshot,
    schemaVersion: 3,
    savedAt: new Date().toISOString(),
  });
}

export async function loadCloudSnapshot(uid) {
  const context = await getFirebaseContext();
  if (!context || !uid) {
    return null;
  }

  const snapshot = await context.firestore.getDoc(
    context.firestore.doc(context.db, 'users', uid, 'snapshots', 'current')
  );

  return snapshot.exists() ? snapshot.data() : null;
}

# Firebase Setup Guide

Use this guide when you want to stop debugging the old Firebase project and connect Voice Business Tracker to a fresh Firebase project.

## 1. Create A New Firebase Project

1. Open [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**.
3. Enter a new project name, for example `voice-business-tracker-new`.
4. Disable or enable Google Analytics as you prefer.
5. Click **Create project**.

## 2. Add A Web App

1. In the new Firebase project, click the **Web** icon: `</>`.
2. App nickname: `Voice Business Tracker Web`.
3. Do not enable Firebase Hosting here unless you want it.
4. Click **Register app**.
5. Copy the Firebase config values.

You will need these values:

```txt
apiKey
authDomain
projectId
storageBucket
messagingSenderId
appId
measurementId
```

## 3. Enable Authentication

1. Go to **Build > Authentication**.
2. Click **Get started**.
3. Open **Sign-in method**.
4. Enable **Email/Password**.
5. Save.

## 4. Enable Cloud Firestore

1. Go to **Build > Firestore Database**.
2. Click **Create database**.
3. Choose **Standard edition**.
4. Choose **Production mode**.
5. Select a region close to your users.
6. Create the database.

If you see API errors, also open Google Cloud Console for the same project and make sure **Cloud Firestore API** (`firestore.googleapis.com`) is enabled.

## 5. Add Firestore Rules

In Firebase Console:

1. Go to **Firestore Database > Rules**.
2. Replace the rules with:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**.

These rules allow each logged-in user to read/write only their own data under `users/{uid}`.

## 6. Replace Vercel Environment Variables

In Vercel:

1. Open your project.
2. Go to **Settings > Environment Variables**.
3. Delete old Firebase values.
4. Add the new Firebase Web App values:

```txt
VITE_FIREBASE_API_KEY=your_new_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_new_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_new_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_new_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_new_sender_id
VITE_FIREBASE_APP_ID=your_new_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_new_measurement_id
VITE_ENABLE_DEMO_AUTH=false
```

Use the exact values from the new Firebase Web App config. Do not mix values from old and new Firebase projects.

## 7. Redeploy Vercel

1. Go to **Vercel > Deployments**.
2. Click the latest deployment menu.
3. Click **Redeploy**.
4. Make sure it uses the new environment variables.

After deploy, hard refresh the app or open it in an incognito window so old cached JavaScript is not used.

## 8. Firestore Paths Used By The App

The app writes user data only to these paths:

```txt
users/{uid}/transactions/{transactionId}
users/{uid}/customers/{customerId}
users/{uid}/suppliers/{supplierId}
users/{uid}/inventory/{itemId}
users/{uid}/settings/profile
users/{uid}/debug/test
```

Dashboard and Day Book both read from:

```txt
users/{uid}/transactions
```

## 9. Test Firestore Write

1. Register a new account in the app.
2. Verify the email if verification is enabled.
3. Login.
4. Open **Firestore Test** from the sidebar. It is visible in development or for the Owner role.
5. Click **Run Firestore Test**.
6. Open browser console and look for:

```txt
DEBUG_FIRESTORE_TEST_START
DEBUG_FIRESTORE_TEST_SUCCESS
```

If there is a timeout, you will see:

```txt
DEBUG_FIRESTORE_TEST_TIMEOUT
FIRESTORE_WRITE_TIMEOUT
```

## 10. Confirm In Firebase Console

After a successful debug test, go to:

```txt
Firebase Console
Cloud Firestore
Data
users
{uid}
debug
test
```

You should see:

```js
{
  message: "hello firestore",
  createdAt: <timestamp>
}
```

After adding a customer, you should see:

```txt
users/{uid}/customers/{customerId}
```

After adding a transaction or voice voucher, you should see:

```txt
users/{uid}/transactions/{transactionId}
```

## 11. Important Production Notes

- Production business data must not use localStorage, sessionStorage, IndexedDB, mock storage, or fake success messages.
- The app shows success only after Firestore writes and a read-back confirms the document exists.
- Allowed browser localStorage is only for harmless UI settings such as dark mode and local development demo auth.
- Keep `VITE_ENABLE_DEMO_AUTH=false` in Vercel production.
- Do not enable Firebase App Check until normal Firestore writes are working. If you later enable App Check, configure allowed domains first.

## 12. Common Errors

### 403 CONSUMER_INVALID

Usually means the Firebase config points to the wrong project, or Cloud Firestore API is not enabled for that project.

Check:

```txt
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_AUTH_DOMAIN
Cloud Firestore API enabled
Firestore database created
```

### 403 PERMISSION_DENIED

Usually means Firestore rules reject the write, App Check enforcement is blocking requests, or the logged-in user uid does not match the path.

Check:

```txt
request.auth.uid
users/{uid}/...
Firestore rules published
App Check enforcement disabled during setup
```

### Firestore write timed out

Check:

```txt
Firebase project env vars
Cloud Firestore API
Firestore rules
Network/browser cache
Vercel redeployed after env changes
```

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const env = require('./env');
const path = require('path');
const fs = require('fs');

let firebaseInitialized = false;

/**
 * Initializes Firebase Admin SDK using a service account JSON file.
 * Called once during server startup — safe to call multiple times (idempotent).
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_PATH in .env pointing to your
 * Firebase project's service account key JSON file.
 *
 * Download it from:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 */
const initializeFirebase = () => {
  if (firebaseInitialized || getApps().length > 0) {
    firebaseInitialized = true;
    return;
  }

  const serviceAccount = env.firebaseServiceAccount;

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.warn(
      '⚠️  Firebase: Firebase service account variables (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY) are not set. FCM push notifications will be disabled.'
    );
    return;
  }

  try {
    initializeApp({
      credential: cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
  }
};

/**
 * Returns true if Firebase has been successfully initialized.
 */
const isFirebaseReady = () => firebaseInitialized && getApps().length > 0;

module.exports = { initializeFirebase, isFirebaseReady };



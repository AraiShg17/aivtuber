import admin from 'firebase-admin';

function initializeFirebase() {
  if (admin.apps.length > 0) return;
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
    // Credential: ADC on Cloud Run, GOOGLE_APPLICATION_CREDENTIALS for local dev
  });
}

initializeFirebase();

export const db = admin.firestore();

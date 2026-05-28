import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';

function initializeFirebase(): Firestore | null {
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.warn('[firestore] FIREBASE_PROJECT_ID が未設定のため、会話記憶は無効です');
    return null;
  }
  try {
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
    }
    const databaseId = process.env.FIREBASE_DATABASE_ID ?? '(default)';
    return getFirestore(admin.app(), databaseId);
  } catch (err) {
    console.warn('[firestore] 初期化に失敗しました。会話記憶は無効です:', err);
    return null;
  }
}

export const db = initializeFirebase();

import { db } from '@/services/firestore/client';
import { FieldValue } from 'firebase-admin/firestore';
import type { MessageRecord } from '@/types';

export async function upsertUser(userId: string, userName: string): Promise<void> {
  const userRef = db.collection('users').doc(userId);
  const snapshot = await userRef.get();

  if (snapshot.exists) {
    await userRef.update({ userName, lastSeenAt: FieldValue.serverTimestamp() });
  } else {
    await userRef.set({
      userId,
      userName,
      firstSeenAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
    });
  }
}

export async function saveMessage(
  record: Omit<MessageRecord, 'createdAt'>
): Promise<void> {
  await db.collection('messages').add({
    ...record,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getRecentMessages(
  userId: string,
  limit = 5
): Promise<MessageRecord[]> {
  const snapshot = await db
    .collection('messages')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      userId: data.userId as string,
      commentId: data.commentId as string,
      userMessage: data.userMessage as string,
      aiMessage: data.aiMessage as string,
      createdAt: (data.createdAt as { toDate: () => Date }).toDate(),
    };
  });
}

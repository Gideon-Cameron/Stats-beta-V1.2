import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';

/**
 * Saves the user's stat, keeps the first-ever snapshot, and rolls over the rest (max 10 total).
 */
export async function saveUserStats<T extends Record<string, unknown>>(
  user: User,
  category: string,
  data: T & { averageScore: number; globalRank: string }
) {
  if (!user) throw new Error('User not authenticated');

  // Save current stat to user doc
  const ref = doc(db, 'users', user.uid);
  await setDoc(ref, { [category]: data }, { merge: true });

  // Get history collection
  const historyRef = collection(db, 'users', user.uid, 'stats', category, 'history');

  // Fetch existing history (ordered oldest → newest)
  const q = query(historyRef, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  const entries = snapshot.docs;

  // Always keep the very first snapshot
  // const first = entries[0];  // we will be keeping this as a option for later

  // If more than 10 entries, delete the oldest *after the first*
  if (entries.length >= 10) {
    const toDelete = entries[1]; // second entry, first is preserved
    if (toDelete) {
      await deleteDoc(toDelete.ref);
      console.log('[History] Deleted oldest (excluding first) to maintain limit.');
    }
  }

  // Save new snapshot
  const now = Date.now();
  await addDoc(historyRef, {
    ...data,
    timestamp: now,
  });

  console.log('[History] New snapshot saved at', new Date(now).toISOString());
}

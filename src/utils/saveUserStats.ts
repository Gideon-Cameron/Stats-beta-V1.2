import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';

export async function saveUserStats<T extends Record<string, unknown>>(
  user: User,
  category: string,
  data: T & { averageScore: number; globalRank: string }
) {
  if (!user) throw new Error('User not authenticated');

  // 1. Save current stat object (overwrites latest)
  const ref = doc(db, 'users', user.uid);
  await setDoc(ref, { [category]: data }, { merge: true });

  // 2. Get history collection reference
  const historyRef = collection(db, 'users', user.uid, 'stats', category, 'history');

  // 3. Load latest snapshot if any
  const q = query(historyRef, orderBy('timestamp', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  const latest = snapshot.docs[0]?.data() as (T & { timestamp: number }) | undefined;

  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  const isTooSoon = latest && now - latest.timestamp < oneWeek;
  const isSame = latest && JSON.stringify(latest) === JSON.stringify({ ...data, timestamp: latest.timestamp });

  // 4. Always add if no history exists (first ever snapshot)
  const shouldAddSnapshot = !latest || (!isTooSoon && !isSame);

  if (shouldAddSnapshot) {
    await addDoc(historyRef, {
      ...data,
      timestamp: now,
    });
    console.log('[History] New snapshot saved at', new Date(now).toISOString());
  } else {
    console.log('[Snapshot Skipped]', data);
  }

  // 5. 🧹 Prune oldest if more than 10 exist
  const allSnapshots = await getDocs(query(historyRef, orderBy('timestamp', 'asc')));
  if (allSnapshots.size > 10) {
    const excess = allSnapshots.size - 10;
    const docsToDelete = allSnapshots.docs.slice(0, excess);
    await Promise.all(docsToDelete.map(doc => deleteDoc(doc.ref)));
    console.log(`[History] Pruned ${excess} old snapshot(s)`);
  }
}

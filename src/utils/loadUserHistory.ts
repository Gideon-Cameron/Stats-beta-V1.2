import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';

/**
 * Load a user's full stat history for a given category.
 * Includes Firestore document ID for each snapshot.
 *
 * @param user Firebase authenticated user
 * @param category e.g. "endurance", "strength"
 * @returns Array of history entries with document IDs (ordered oldest → newest)
 */
export async function loadUserHistory<T>(
  user: User,
  category: string
): Promise<(T & { timestamp: number; id: string })[]> {
  if (!user) throw new Error('User not authenticated');

  const historyRef = collection(db, 'users', user.uid, 'stats', category, 'history');
  const q = query(historyRef, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data() as T & { timestamp: number };
    return { ...data, id: doc.id };
  });
}

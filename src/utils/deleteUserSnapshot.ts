import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';

/**
 * Deletes a snapshot document from the user's history.
 *
 * @param user - The authenticated user
 * @param category - The stat category (e.g., 'endurance', 'strength', etc.)
 * @param snapshotId - The Firestore document ID of the snapshot to delete
 */
export async function deleteUserSnapshot(
  user: User,
  category: string,
  snapshotId: string
): Promise<void> {
  if (!user) throw new Error('User not authenticated');
  if (!snapshotId) throw new Error('Snapshot ID is required');

  const snapshotRef = doc(db, 'users', user.uid, 'stats', category, 'history', snapshotId);
  await deleteDoc(snapshotRef);

  console.log(`[Snapshot Deleted] ID: ${snapshotId}`);
}

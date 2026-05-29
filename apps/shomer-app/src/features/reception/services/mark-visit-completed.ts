import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function markVisitCompleted(
  clinicId: string,
  branchId: string,
  visitId: string,
): Promise<void> {
  await updateDoc(doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`), {
    status: 'completed',
    updatedAt: serverTimestamp(),
  })
}

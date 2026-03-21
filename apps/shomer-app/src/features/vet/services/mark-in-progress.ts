import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function markVisitInProgress(
  clinicId: string,
  branchId: string,
  visitId: string,
): Promise<void> {
  const visitRef = doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`)
  await updateDoc(visitRef, {
    status: 'in-progress',
    updatedAt: serverTimestamp(),
  })
}

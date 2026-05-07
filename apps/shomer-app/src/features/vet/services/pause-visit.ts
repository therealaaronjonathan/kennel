import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ConsultationDraftInput } from './consultation-draft'

export async function pauseVisit(
  clinicId: string,
  branchId: string,
  visitId: string,
  draft?: ConsultationDraftInput,
): Promise<void> {
  const visitRef = doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`)
  const update: Record<string, unknown> = {
    status: 'waiting',
    updatedAt: serverTimestamp(),
  }
  if (draft) {
    update.consultationDraft = { ...draft, savedAt: serverTimestamp() }
  }
  await updateDoc(visitRef, update)
}

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { buildDraftDoc, type ConsultationDraftInput } from './consultation-draft'

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
    update.consultationDraft = buildDraftDoc(draft, serverTimestamp())
  }
  await updateDoc(visitRef, update)
}

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { buildDraftDoc, type ConsultationDraftInput } from './consultation-draft'

export async function reassignVisit(
  clinicId: string,
  branchId: string,
  visitId: string,
  newDoctorId: string,
  newDoctorName: string,
  draft?: ConsultationDraftInput,
): Promise<void> {
  const update: Record<string, unknown> = {
    doctorId: newDoctorId,
    doctorName: newDoctorName,
    status: 'waiting',
    updatedAt: serverTimestamp(),
  }
  if (draft) {
    update.consultationDraft = buildDraftDoc(draft, serverTimestamp())
  }
  await updateDoc(
    doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`),
    update,
  )
}

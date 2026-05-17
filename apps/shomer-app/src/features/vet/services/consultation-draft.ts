import {
  deleteField,
  doc,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { DiagnosisEntry, PrescriptionEntry } from './complete-visit'
import type { ServiceEntry } from '@/components/blocks/services-select'

/**
 * Consultation draft stored on the visit doc so a vet's in-progress work
 * survives pause → switch patient → resume, browser refresh, and crashes.
 * Cleared by `completeVisit` when the visit is finalized.
 */
export interface ConsultationDraft {
  diagnoses: DiagnosisEntry[]
  consultationNotes: string
  medicines: PrescriptionEntry[]
  services: ServiceEntry[]
  vaccines: { name: string; batch: string; nextDue: string }[]
  petWeightKg?: number
  petTemperatureF?: number
  savedAt?: Timestamp
}

export type ConsultationDraftInput = Omit<ConsultationDraft, 'savedAt'>

export async function saveConsultationDraft(
  clinicId: string,
  branchId: string,
  visitId: string,
  draft: ConsultationDraftInput,
): Promise<void> {
  await updateDoc(
    doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`),
    {
      consultationDraft: { ...draft, savedAt: serverTimestamp() },
      updatedAt: serverTimestamp(),
    },
  )
}

export async function clearConsultationDraft(
  clinicId: string,
  branchId: string,
  visitId: string,
): Promise<void> {
  await updateDoc(
    doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`),
    {
      consultationDraft: deleteField(),
      updatedAt: serverTimestamp(),
    },
  )
}

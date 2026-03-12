import { addDoc, collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ConsultationFormData {
  diagnosis: string
  medicines: string
  vaccineName: string
  vaccineBatch: string
  vaccineNextDue: string
  services: string
}

export async function completeVisit(
  clinicId: string,
  branchId: string,
  visitId: string,
  form: ConsultationFormData,
): Promise<void> {
  const visitRef = doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`)
  const batch = writeBatch(db)

  const updates: Record<string, unknown> = {
    status: 'completed',
    updatedAt: serverTimestamp(),
  }
  if (form.services) {
    updates.services = form.services
  }
  batch.update(visitRef, updates)

  await batch.commit()

  // Subdocs must be written with addDoc after batch (addDoc not supported in batches)
  const writes: Promise<unknown>[] = []

  if (form.diagnosis) {
    writes.push(
      addDoc(
        collection(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}/diagnoses`),
        { text: form.diagnosis, createdAt: serverTimestamp() },
      ),
    )
  }

  if (form.medicines) {
    writes.push(
      addDoc(
        collection(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}/prescriptions`),
        { text: form.medicines, createdAt: serverTimestamp() },
      ),
    )
  }

  if (form.vaccineName) {
    writes.push(
      addDoc(
        collection(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}/vaccines`),
        {
          name: form.vaccineName,
          batch: form.vaccineBatch || null,
          nextDue: form.vaccineNextDue || null,
          createdAt: serverTimestamp(),
        },
      ),
    )
  }

  await Promise.all(writes)
}

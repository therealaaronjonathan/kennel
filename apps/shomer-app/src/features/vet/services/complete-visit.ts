import { addDoc, collection, deleteField, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { amountDue, serviceSubtotal, type DiscountApprover, type VisitDiscount } from '@/features/checkout/services/discount'
import { discountVisitFields, stageDiscountApproval } from '@/features/checkout/services/save-discount'

export interface DiagnosisEntry {
  diagnosisId: string | null
  name: string
  notes: string
  isCustom: boolean
}

export interface PrescriptionEntry {
  medicineId: string | null
  name: string
  type: 'tablet' | 'syrup' | 'injection'
  quantity: string
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  days: number
  isCustom: boolean
  mealTiming?: 'before' | 'after'
}

export interface ServiceEntry {
  serviceId: string
  name: string
  price: number
  quantity?: number
}

export interface VaccineEntry {
  name: string
  batch: string
  nextDue: string
}

export interface ConsultationFormData {
  diagnoses: DiagnosisEntry[]
  consultationNotes: string
  medicines: PrescriptionEntry[]
  services: ServiceEntry[]
  vaccines: VaccineEntry[]
  petWeightKg?: number
  petTemperatureF?: number
  discount?: VisitDiscount | null
  approver?: DiscountApprover | null
}

export async function completeVisit(
  clinicId: string,
  branchId: string,
  visitId: string,
  form: ConsultationFormData,
): Promise<void> {
  const visitRef = doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`)
  const discount = form.discount ?? null
  const billAmount = amountDue(serviceSubtotal(form.services), discount)

  const batch = writeBatch(db)
  const visitUpdate: Record<string, unknown> = {
    status: 'completed',
    services: form.services,
    billAmount,
    ...discountVisitFields(discount),
    consultationNotes: form.consultationNotes,
    consultationDraft: deleteField(),
    updatedAt: serverTimestamp(),
  }
  if (typeof form.petWeightKg === 'number') {
    visitUpdate.petWeightKg = form.petWeightKg
  }
  if (typeof form.petTemperatureF === 'number') {
    visitUpdate.petTemperatureF = form.petTemperatureF
  }
  batch.update(visitRef, visitUpdate)
  stageDiscountApproval(
    batch,
    clinicId,
    branchId,
    visitId,
    discount,
    form.approver ?? null,
    false,
    billAmount,
  )
  await batch.commit()

  const visitBase = `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`
  const writes: Promise<unknown>[] = []

  for (const diagnosis of form.diagnoses) {
    writes.push(
      addDoc(collection(db, `${visitBase}/diagnoses`), {
        diagnosisId: diagnosis.diagnosisId,
        name: diagnosis.name,
        notes: diagnosis.notes,
        isCustom: diagnosis.isCustom,
        createdAt: serverTimestamp(),
      }),
    )
  }

  for (const medicine of form.medicines) {
    const presDoc: Record<string, unknown> = {
      medicineId: medicine.medicineId,
      name: medicine.name,
      type: medicine.type,
      quantity: medicine.quantity,
      morning: medicine.morning,
      afternoon: medicine.afternoon,
      evening: medicine.evening,
      night: medicine.night,
      days: medicine.days,
      isCustom: medicine.isCustom,
      createdAt: serverTimestamp(),
    }
    if (medicine.mealTiming) presDoc.mealTiming = medicine.mealTiming
    writes.push(addDoc(collection(db, `${visitBase}/prescriptions`), presDoc))
  }

  for (const vaccine of form.vaccines) {
    if (vaccine.name) {
      writes.push(
        addDoc(collection(db, `${visitBase}/vaccines`), {
          name: vaccine.name,
          batch: vaccine.batch || null,
          nextDue: vaccine.nextDue || null,
          createdAt: serverTimestamp(),
        }),
      )
    }
  }

  await Promise.all(writes)
}

import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Diagnoses
export async function addClinicDiagnosis(clinicId: string, name: string): Promise<void> {
  await addDoc(collection(db, `clinics/${clinicId}/diagnosisCatalog`), {
    name,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteClinicDiagnosis(clinicId: string, diagnosisId: string): Promise<void> {
  await deleteDoc(doc(db, `clinics/${clinicId}/diagnosisCatalog/${diagnosisId}`))
}

// Medicines
export type MedicineType = 'tablet' | 'syrup' | 'injection'

export const MEDICINE_TYPES: { value: MedicineType; label: string }[] = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'syrup', label: 'Syrup' },
  { value: 'injection', label: 'Injection' },
]

export async function addClinicMedicine(
  clinicId: string,
  name: string,
  type: MedicineType,
): Promise<void> {
  await addDoc(collection(db, `clinics/${clinicId}/medicinesCatalog`), {
    name,
    type,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function setClinicMedicineActive(
  clinicId: string,
  medicineId: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, `clinics/${clinicId}/medicinesCatalog/${medicineId}`), {
    isActive,
    updatedAt: serverTimestamp(),
  })
}

// Services
export async function addClinicService(
  clinicId: string,
  name: string,
  price: number,
): Promise<void> {
  await addDoc(collection(db, `clinics/${clinicId}/services`), {
    name,
    price,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function setClinicServiceActive(
  clinicId: string,
  serviceId: string,
  isActive: boolean,
): Promise<void> {
  await updateDoc(doc(db, `clinics/${clinicId}/services/${serviceId}`), {
    isActive,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Rename a catalog row, and replace its price when one is passed.
 * Visits keep the name and price copied onto them when the line was added.
 */
export async function updateCatalogEntry(
  collectionPath: string,
  id: string,
  fields: { name: string; price?: number },
): Promise<void> {
  const name = fields.name.trim()
  if (!name) throw new Error('Enter a name.')
  const data: Record<string, unknown> = {
    name,
    updatedAt: serverTimestamp(),
  }
  if (fields.price !== undefined) {
    if (!Number.isFinite(fields.price) || fields.price < 0) throw new Error('Enter a price.')
    data.price = Math.round(fields.price)
  }
  await updateDoc(doc(db, `${collectionPath}/${id}`), data)
}

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

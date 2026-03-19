import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function setDoctorOnDuty(
  clinicId: string,
  branchId: string,
  doctorId: string,
  onDuty: boolean,
  currentOnDuty: string[],
): Promise<void> {
  const today = todayString()
  const next = onDuty
    ? [...new Set([...currentOnDuty, doctorId])]
    : currentOnDuty.filter((id) => id !== doctorId)

  await setDoc(
    doc(db, `clinics/${clinicId}/branches/${branchId}/dutyRoster/${today}`),
    { onDuty: next, date: today },
    { merge: true },
  )
}

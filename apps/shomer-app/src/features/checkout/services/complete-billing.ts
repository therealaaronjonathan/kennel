import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ServiceEntry {
  serviceId: string
  name: string
  price: number
}

export async function completeBilling(
  clinicId: string,
  branchId: string,
  visitId: string,
  services: ServiceEntry[],
): Promise<void> {
  const billAmount = services.reduce((sum, s) => sum + s.price, 0)
  await updateDoc(
    doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`),
    {
      status: 'billed',
      services,
      billAmount,
      billedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  )
}

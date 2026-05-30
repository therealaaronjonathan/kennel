import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ServiceEntry } from '@/components/blocks/services-select'

export async function markVisitCompleted(
  clinicId: string,
  branchId: string,
  visitId: string,
  services: ServiceEntry[] = [],
): Promise<void> {
  const billAmount = services.reduce((sum, s) => sum + s.price * s.quantity, 0)
  const update: Record<string, unknown> = {
    status: 'completed',
    updatedAt: serverTimestamp(),
  }
  if (services.length > 0) {
    update.services = services
    update.billAmount = billAmount
  }
  await updateDoc(doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`), update)
}

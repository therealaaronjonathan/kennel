import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { CompletedVisit } from '@/features/dashboard/services/use-completed-visits'
import { amountDue, serviceSubtotal } from './discount'

export async function addToBillingDefaults(
  clinicId: string,
  branchId: string,
  visit: CompletedVisit,
): Promise<void> {
  const user = auth.currentUser
  const billAmount = amountDue(serviceSubtotal(visit.services ?? []), visit.discount)

  await setDoc(
    doc(db, `clinics/${clinicId}/branches/${branchId}/billingDefaults/${visit.id}`),
    {
      visitId: visit.id,
      petName: visit.petName,
      ownerName: visit.ownerName,
      ownerId: visit.ownerId,
      tokenDisplay: visit.tokenDisplay,
      billAmount,
      date: visit.date,
      addedAt: serverTimestamp(),
      addedBy: user?.uid ?? '',
      addedByName: user?.displayName ?? user?.email ?? 'Staff',
    },
  )
}

export async function removeFromBillingDefaults(
  clinicId: string,
  branchId: string,
  visitId: string,
): Promise<void> {
  await deleteDoc(
    doc(db, `clinics/${clinicId}/branches/${branchId}/billingDefaults/${visitId}`),
  )
}

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type PaymentMethod = 'cash' | 'card' | 'upi'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
}

export interface ServiceEntry {
  serviceId: string
  name: string
  price: number
  quantity?: number
}

export async function completeBilling(
  clinicId: string,
  branchId: string,
  visitId: string,
  services: ServiceEntry[],
  paymentMethod: PaymentMethod,
): Promise<void> {
  const billAmount = services.reduce(
    (sum, s) => sum + (s.quantity ?? 1) * s.price,
    0,
  )
  await updateDoc(
    doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`),
    {
      status: 'billed',
      services,
      billAmount,
      paymentMethod,
      billedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  )
}

export async function updatePaymentMethod(
  clinicId: string,
  branchId: string,
  visitId: string,
  paymentMethod: PaymentMethod,
): Promise<void> {
  await updateDoc(
    doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`),
    {
      paymentMethod,
      updatedAt: serverTimestamp(),
    },
  )
}

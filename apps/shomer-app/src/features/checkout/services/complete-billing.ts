import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type PaymentMethod = 'cash' | 'card' | 'upi'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
}

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'upi']

export interface PaymentEntry {
  method: PaymentMethod
  amount: number
}

export interface ServiceEntry {
  serviceId: string
  name: string
  price: number
  quantity?: number
}

export function sumPayments(payments: PaymentEntry[] | undefined): number {
  if (!payments) return 0
  return payments.reduce((s, p) => s + (p.amount ?? 0), 0)
}

function computeBillAmount(services: ServiceEntry[]): number {
  return services.reduce((sum, s) => sum + (s.quantity ?? 1) * s.price, 0)
}

function sanitizePayments(payments: PaymentEntry[]): PaymentEntry[] {
  return payments
    .filter((p) => p.amount > 0)
    .map((p) => ({ method: p.method, amount: Math.round(p.amount) }))
}

/**
 * Record payments at checkout. Sets status based on amount paid:
 * - sum === billAmount → status 'billed' (sets billedAt)
 * - 0 < sum < billAmount → status stays 'completed' (partial payment)
 * Throws if sum exceeds billAmount or is non-positive.
 */
export async function recordPayments(
  clinicId: string,
  branchId: string,
  visitId: string,
  services: ServiceEntry[],
  payments: PaymentEntry[],
): Promise<void> {
  const billAmount = computeBillAmount(services)
  const cleaned = sanitizePayments(payments)
  const amountPaid = sumPayments(cleaned)

  if (amountPaid <= 0) {
    throw new Error('Enter a payment amount.')
  }
  if (amountPaid > billAmount) {
    throw new Error('Payment exceeds bill total.')
  }

  const isFullyPaid = amountPaid === billAmount

  const update: Record<string, unknown> = {
    services,
    billAmount,
    payments: cleaned,
    amountPaid,
    status: isFullyPaid ? 'billed' : 'completed',
    updatedAt: serverTimestamp(),
  }
  if (isFullyPaid) {
    update.billedAt = serverTimestamp()
  }

  await updateDoc(
    doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`),
    update,
  )
}

/**
 * Update payments on an already-billed visit. Sum must equal billAmount.
 * Status stays 'billed', billedAt is preserved.
 */
export async function updatePayments(
  clinicId: string,
  branchId: string,
  visitId: string,
  payments: PaymentEntry[],
  billAmount: number,
): Promise<void> {
  const cleaned = sanitizePayments(payments)
  const amountPaid = sumPayments(cleaned)

  if (amountPaid !== billAmount) {
    throw new Error('Payments must add up to the bill total.')
  }

  await updateDoc(
    doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`),
    {
      payments: cleaned,
      amountPaid,
      updatedAt: serverTimestamp(),
    },
  )
}

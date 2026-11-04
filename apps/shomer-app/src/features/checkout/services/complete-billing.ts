import { doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { amountDue, serviceSubtotal, type DiscountApprover, type VisitDiscount } from './discount'
import { discountVisitFields, stageDiscountApproval } from './save-discount'
import { stagePaymentLedger, type LedgerContext } from './payment-ledger'

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
  return serviceSubtotal(services)
}

export interface BillAdjustment {
  discount: VisitDiscount | null
  approver: DiscountApprover | null
  /** Update the pinned billing-default amount. Skip once the visit is fully paid. */
  pinned: boolean
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
 * Throws if sum exceeds billAmount. A zero payment is allowed only when the
 * amount due is zero (a discount covered the whole bill).
 * `adjustment` publishes the discount in the same batch. Omit it to leave any
 * existing discount untouched.
 */
export async function recordPayments(
  clinicId: string,
  branchId: string,
  visitId: string,
  services: ServiceEntry[],
  payments: PaymentEntry[],
  ledgerCtx: LedgerContext,
  adjustment?: BillAdjustment,
): Promise<void> {
  const subtotal = computeBillAmount(services)
  const billAmount = adjustment ? amountDue(subtotal, adjustment.discount) : subtotal
  const cleaned = sanitizePayments(payments)
  const amountPaid = sumPayments(cleaned)

  if (amountPaid < 0 || (amountPaid === 0 && billAmount > 0)) {
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
  if (adjustment) {
    Object.assign(update, discountVisitFields(adjustment.discount))
  }
  if (isFullyPaid) {
    update.billedAt = serverTimestamp()
  }

  // Visit update + payment-ledger rows commit together. The ledger logs the
  // per-method delta collected in THIS action, dated today, so money lands on
  // the day it was received (not the visit's creation date).
  const batch = writeBatch(db)
  batch.update(
    doc(db, `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`),
    update,
  )
  if (adjustment) {
    stageDiscountApproval(
      batch,
      clinicId,
      branchId,
      visitId,
      adjustment.discount,
      adjustment.approver,
      adjustment.pinned && !isFullyPaid,
      billAmount,
    )
  }
  stagePaymentLedger(batch, clinicId, branchId, visitId, cleaned, ledgerCtx)
  await batch.commit()
}

/**
 * Update payments on an already-billed visit. Sum must equal billAmount.
 * Status stays 'billed', billedAt is preserved.
 *
 * Deliberately does NOT write payment-ledger rows: the total is unchanged
 * (no money moved), so this is a method-label correction, not a collection
 * event. Writing today-dated deltas here would distort the daily tally with
 * money that physically arrived earlier. The ledger stays the record of when
 * money actually came in.
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

import { collection, doc, serverTimestamp, type WriteBatch } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { PAYMENT_METHODS, type PaymentEntry, type PaymentMethod } from './complete-billing'

/**
 * Payment ledger — one immutable row per money movement.
 *
 * Location: clinics/{clinicId}/branches/{branchId}/payments/{paymentId}
 *
 * The visit doc remains the source of truth for per-visit payment STATUS
 * (`amountPaid` / `status`). The ledger is the source of truth for "how much
 * money came in on a given day" — a cross-visit, date-bucketed question the
 * visit doc can't answer, because a visit created on day 1 may be paid across
 * several later days.
 *
 * Invariant: sum(ledger rows where visitId == V) === visit.amountPaid.
 */
export interface PaymentRecord {
  visitId: string
  petId: string
  ownerId: string
  amount: number          // delta collected in this transaction (negative on a correction)
  method: PaymentMethod
  date: string            // YYYY-MM-DD — day money was received (local); the tally bucket key
  recordedBy: string      // staff uid ('backfill' for migrated rows)
  petName: string         // display snapshots (backfilled by edit-names on rename)
  ownerName: string
  tokenDisplay: string
  visitDate: string       // original visit.date (consultation day), for context
  source: 'checkout' | 'backfill'
}

export interface LedgerContext {
  petId: string
  ownerId: string
  petName: string
  ownerName: string
  tokenDisplay: string
  visitDate: string
  /** Payments persisted on the visit BEFORE this checkout action. */
  previousPayments: PaymentEntry[]
}

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sumForMethod(payments: PaymentEntry[], method: PaymentMethod): number {
  return payments.filter((p) => p.method === method).reduce((s, p) => s + (p.amount ?? 0), 0)
}

/**
 * Per-method delta between the previously persisted cumulative payments and the
 * new cumulative payments. Because `payments[]` stores one entry per method, the
 * delta for each method is "what was added this session for that method" — works
 * whether it's a new method or topping up an existing one.
 */
export function diffPaymentsByMethod(
  previous: PaymentEntry[],
  next: PaymentEntry[],
): { method: PaymentMethod; delta: number }[] {
  const out: { method: PaymentMethod; delta: number }[] = []
  for (const method of PAYMENT_METHODS) {
    const delta = sumForMethod(next, method) - sumForMethod(previous, method)
    if (delta !== 0) out.push({ method, delta })
  }
  return out
}

/**
 * Stage ledger writes onto an existing WriteBatch — one row per non-zero
 * per-method delta, dated today. Call alongside the visit update so both commit
 * atomically. No-op when no money moved (e.g. a method-only edit that nets zero).
 */
export function stagePaymentLedger(
  batch: WriteBatch,
  clinicId: string,
  branchId: string,
  visitId: string,
  nextPayments: PaymentEntry[],
  ctx: LedgerContext,
): void {
  const deltas = diffPaymentsByMethod(ctx.previousPayments, nextPayments)
  if (deltas.length === 0) return

  const date = todayString()
  const recordedBy = auth.currentUser?.uid ?? 'unknown'
  const collRef = collection(db, `clinics/${clinicId}/branches/${branchId}/payments`)

  for (const { method, delta } of deltas) {
    const row: PaymentRecord = {
      visitId,
      petId: ctx.petId,
      ownerId: ctx.ownerId,
      amount: delta,
      method,
      date,
      recordedBy,
      petName: ctx.petName,
      ownerName: ctx.ownerName,
      tokenDisplay: ctx.tokenDisplay,
      visitDate: ctx.visitDate,
      source: 'checkout',
    }
    batch.set(doc(collRef), { ...row, recordedAt: serverTimestamp() })
  }
}

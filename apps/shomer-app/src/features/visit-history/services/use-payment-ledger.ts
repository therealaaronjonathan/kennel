import { useEffect, useState } from 'react'
import {
  collection,
  documentId,
  getDocs,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { PAYMENT_METHODS, type PaymentMethod } from '@/features/checkout/services/complete-billing'

export interface LedgerTotals {
  totalEarned: number
  byMethod: Record<PaymentMethod, number>
}

const EMPTY: LedgerTotals = {
  totalEarned: 0,
  byMethod: { cash: 0, card: 0, upi: 0 },
}

const IN_QUERY_LIMIT = 30

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = []
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size))
  return out
}

function sumLedgerDocs(
  docs: QueryDocumentSnapshot<DocumentData>[],
  allowVisitId?: (visitId: string) => boolean,
): LedgerTotals {
  const byMethod: Record<PaymentMethod, number> = { cash: 0, card: 0, upi: 0 }
  let totalEarned = 0
  for (const d of docs) {
    const data = d.data()
    const visitId = typeof data.visitId === 'string' ? data.visitId : ''
    if (allowVisitId && !allowVisitId(visitId)) continue
    const amount = typeof data.amount === 'number' ? data.amount : 0
    const method = data.method as PaymentMethod
    totalEarned += amount
    if (PAYMENT_METHODS.includes(method)) byMethod[method] += amount
  }
  return { totalEarned, byMethod }
}

/**
 * Money actually collected within a date range, read from the payment ledger
 * (clinics/{c}/branches/{b}/payments), bucketed by payment `date`. This is the
 * source of truth for "how much came in" — it counts a payment on the day it
 * was received, not on the visit's creation date.
 *
 * Single-field range query on `date` (auto-indexed). Sums client-side.
 * When `doctorId` is set, payments are kept only if their visit is assigned
 * to that doctor (join via visitId — ledger rows do not store doctorId).
 */
export function usePaymentLedger(
  clinicId: string | null,
  branchId: string | null,
  fromDate: string,
  toDate: string,
  doctorId?: string | null,
) {
  const [totals, setTotals] = useState<LedgerTotals>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clinicId || !branchId || !fromDate || !toDate) {
      setTotals(EMPTY)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const q = query(
      collection(db, `clinics/${clinicId}/branches/${branchId}/payments`),
      where('date', '>=', fromDate),
      where('date', '<=', toDate),
    )

    getDocs(q)
      .then(async (snap) => {
        if (cancelled) return
        if (!doctorId) {
          setTotals(sumLedgerDocs(snap.docs))
          setLoading(false)
          return
        }

        const visitIds = [
          ...new Set(
            snap.docs
              .map((d) => {
                const id = d.data().visitId
                return typeof id === 'string' ? id : ''
              })
              .filter(Boolean),
          ),
        ]

        const doctorByVisit = new Map<string, string>()
        const visitsCol = collection(db, `clinics/${clinicId}/branches/${branchId}/visits`)
        for (const ids of chunkIds(visitIds, IN_QUERY_LIMIT)) {
          if (cancelled) return
          const visitSnap = await getDocs(query(visitsCol, where(documentId(), 'in', ids)))
          for (const v of visitSnap.docs) {
            doctorByVisit.set(v.id, (v.data().doctorId as string) ?? '')
          }
        }
        if (cancelled) return

        setTotals(
          sumLedgerDocs(snap.docs, (visitId) => doctorByVisit.get(visitId) === doctorId),
        )
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Payment ledger query error:', err)
        setError('Failed to load payment totals.')
        setTotals(EMPTY)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [clinicId, branchId, fromDate, toDate, doctorId])

  return { totals, loading, error }
}

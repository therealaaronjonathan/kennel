import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
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

/**
 * Money actually collected within a date range, read from the payment ledger
 * (clinics/{c}/branches/{b}/payments), bucketed by payment `date`. This is the
 * source of truth for "how much came in" — it counts a payment on the day it
 * was received, not on the visit's creation date.
 *
 * Single-field range query on `date` (auto-indexed). Sums client-side.
 */
export function usePaymentLedger(
  clinicId: string | null,
  branchId: string | null,
  fromDate: string,
  toDate: string,
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
      .then((snap) => {
        if (cancelled) return
        const byMethod: Record<PaymentMethod, number> = { cash: 0, card: 0, upi: 0 }
        let totalEarned = 0
        for (const d of snap.docs) {
          const data = d.data()
          const amount = typeof data.amount === 'number' ? data.amount : 0
          const method = data.method as PaymentMethod
          totalEarned += amount
          if (PAYMENT_METHODS.includes(method)) byMethod[method] += amount
        }
        setTotals({ totalEarned, byMethod })
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
  }, [clinicId, branchId, fromDate, toDate])

  return { totals, loading, error }
}

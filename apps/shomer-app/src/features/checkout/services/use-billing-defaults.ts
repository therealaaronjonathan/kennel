import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface BillingDefaultEntry {
  visitId: string
  petName: string
  ownerName: string
  ownerId: string
  tokenDisplay: string
  billAmount: number
  date: string
  addedAt: Timestamp | null
  addedBy: string
  addedByName: string
}

export function useBillingDefaults(clinicId: string | null, branchId: string | null) {
  const [defaults, setDefaults] = useState<BillingDefaultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clinicId || !branchId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, `clinics/${clinicId}/branches/${branchId}/billingDefaults`),
      orderBy('addedAt', 'asc'),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const entries: BillingDefaultEntry[] = snap.docs.map((d) => {
          const data = d.data()
          return {
            visitId: d.id,
            petName: data.petName ?? '',
            ownerName: data.ownerName ?? '',
            ownerId: data.ownerId ?? '',
            tokenDisplay: data.tokenDisplay ?? '',
            billAmount: data.billAmount ?? 0,
            date: data.date ?? '',
            addedAt: data.addedAt ?? null,
            addedBy: data.addedBy ?? '',
            addedByName: data.addedByName ?? '',
          }
        })
        setDefaults(entries)
        setLoading(false)
      },
      (err) => {
        console.error('Billing defaults snapshot error:', err)
        setError('Failed to load billing defaults.')
        setLoading(false)
      },
    )

    return unsub
  }, [clinicId, branchId])

  return { defaults, loading, error }
}

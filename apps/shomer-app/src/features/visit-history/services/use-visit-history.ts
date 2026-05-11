import { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  sumPayments,
  type PaymentEntry,
  type ServiceEntry,
} from '@/features/checkout/services/complete-billing'

export const HISTORY_RESULT_CAP = 200

export interface HistoryVisit {
  id: string
  tokenDisplay: string
  petName: string
  ownerName: string
  ownerId: string
  petId: string
  doctorName: string
  doctorId: string
  status: string
  isEmergency: boolean
  complaints: string[]
  otherComplaintText?: string
  consultationNotes?: string
  services?: ServiceEntry[]
  billAmount?: number
  payments?: PaymentEntry[]
  amountPaid?: number
  petWeightKg?: number
  date: string
  billedAt: Timestamp | null
  updatedAt: Timestamp | null
  createdAt: Timestamp | null
}

export function useVisitHistory(
  clinicId: string | null,
  branchId: string | null,
  fromDate: string,
  toDate: string,
) {
  const [visits, setVisits] = useState<HistoryVisit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capReached, setCapReached] = useState(false)

  useEffect(() => {
    if (!clinicId || !branchId || !fromDate || !toDate) {
      setVisits([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const q = query(
      collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
      where('date', '>=', fromDate),
      where('date', '<=', toDate),
      orderBy('date', 'desc'),
    )

    getDocs(q)
      .then((snap) => {
        if (cancelled) return
        const all = snap.docs.map((d) => {
          const data = d.data()
          const payments = Array.isArray(data.payments)
            ? (data.payments as PaymentEntry[])
            : undefined
          return {
            id: d.id,
            tokenDisplay: data.tokenDisplay ?? '',
            petName: data.petName ?? '',
            ownerName: data.ownerName ?? '',
            ownerId: data.ownerId ?? '',
            petId: data.petId ?? '',
            doctorName: data.doctorName ?? '',
            doctorId: data.doctorId ?? '',
            status: data.status ?? 'waiting',
            isEmergency: !!data.isEmergency,
            complaints: (data.complaints as string[]) ?? [],
            otherComplaintText: (data.otherComplaintText as string) || undefined,
            consultationNotes: (data.consultationNotes as string) || undefined,
            services: data.services ?? undefined,
            billAmount: typeof data.billAmount === 'number' ? data.billAmount : undefined,
            payments,
            amountPaid:
              typeof data.amountPaid === 'number'
                ? data.amountPaid
                : sumPayments(payments),
            petWeightKg: typeof data.petWeightKg === 'number' ? data.petWeightKg : undefined,
            date: data.date ?? '',
            billedAt: (data.billedAt as Timestamp | undefined) ?? null,
            updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
            createdAt: (data.createdAt as Timestamp | undefined) ?? null,
          } as HistoryVisit
        })

        // Sort by recency: billedAt > updatedAt > createdAt
        all.sort((a, b) => {
          const aT = a.billedAt?.toMillis() ?? a.updatedAt?.toMillis() ?? a.createdAt?.toMillis() ?? 0
          const bT = b.billedAt?.toMillis() ?? b.updatedAt?.toMillis() ?? b.createdAt?.toMillis() ?? 0
          return bT - aT
        })

        const capped = all.slice(0, HISTORY_RESULT_CAP)
        setVisits(capped)
        setCapReached(all.length > HISTORY_RESULT_CAP)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Visit history query error:', err)
        setError('Failed to load visit history.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [clinicId, branchId, fromDate, toDate])

  return { visits, loading, error, capReached }
}

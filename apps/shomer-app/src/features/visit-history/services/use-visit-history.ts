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
  petTemperatureF?: number
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
  doctorId?: string | null,
) {
  const [visits, setVisits] = useState<HistoryVisit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clinicId || !branchId || !fromDate || !toDate) {
      setVisits([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const visitsCol = collection(db, `clinics/${clinicId}/branches/${branchId}/visits`)
    // Date range is capped at 31 days in the UI. When a doctor is selected,
    // constrain in Firestore so the month count is that doctor's visits.
    const q = doctorId
      ? query(
          visitsCol,
          where('doctorId', '==', doctorId),
          where('date', '>=', fromDate),
          where('date', '<=', toDate),
          orderBy('date', 'desc'),
        )
      : query(
          visitsCol,
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
            petTemperatureF: typeof data.petTemperatureF === 'number' ? data.petTemperatureF : undefined,
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

        setVisits(all)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Visit history query error:', err)
        setVisits([])
        setError('Failed to load visit history.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [clinicId, branchId, fromDate, toDate, doctorId])

  return { visits, loading, error }
}

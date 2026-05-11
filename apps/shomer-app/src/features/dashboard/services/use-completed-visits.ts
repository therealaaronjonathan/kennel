import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  sumPayments,
  type PaymentEntry,
} from '@/features/checkout/services/complete-billing'

export interface ServiceEntry {
  serviceId: string
  name: string
  price: number
  quantity?: number
}

export interface CompletedVisit {
  id: string
  tokenDisplay: string
  petName: string
  ownerName: string
  ownerId: string
  petId: string
  doctorName: string
  doctorId: string
  complaints: string[]
  otherComplaintText?: string
  isEmergency?: boolean
  services?: ServiceEntry[]
  billAmount?: number
  payments?: PaymentEntry[]
  amountPaid?: number
  consultationNotes?: string
  petWeightKg?: number
  status?: string
  completedAt: Timestamp | null
  date: string
}

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useCompletedVisits(clinicId: string | null, branchId: string | null) {
  const [visits, setVisits] = useState<CompletedVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clinicId || !branchId) {
      setLoading(false)
      return
    }

    const today = getTodayString()

    // Query all `completed` visits in the branch (no date filter) so we can
    // surface partial-paid carry-overs from earlier days alongside today's
    // pending bills. Volume stays small in practice — `completed` is a
    // transient state; visits flip to `billed` as soon as payment is taken.
    const q = query(
      collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
      where('status', '==', 'completed'),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs
          .map((d) => {
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
              complaints: data.complaints ?? [],
              otherComplaintText: data.otherComplaintText ?? undefined,
              isEmergency: data.isEmergency ?? false,
              services: data.services ?? undefined,
              billAmount: data.billAmount ?? undefined,
              payments,
              amountPaid:
                typeof data.amountPaid === 'number'
                  ? data.amountPaid
                  : sumPayments(payments),
              consultationNotes: data.consultationNotes ?? undefined,
              petWeightKg: typeof data.petWeightKg === 'number' ? data.petWeightKg : undefined,
              completedAt: data.updatedAt ?? null,
              date: data.date ?? today,
            } as CompletedVisit
          })
          // Keep: today's completed (any payment state) + cross-day partials.
          // Drop cross-day abandoned (consultation done, never paid) so the
          // checkout list doesn't pile up with dead entries forever.
          .filter((v) => v.date === today || (v.amountPaid ?? 0) > 0)

        all.sort((a, b) => {
          if (!a.completedAt || !b.completedAt) return 0
          return b.completedAt.toMillis() - a.completedAt.toMillis()
        })

        setVisits(all)
        setLoading(false)
      },
      (err) => {
        console.error('Completed visits snapshot error:', err)
        setError('Failed to load visits.')
        setLoading(false)
      },
    )

    return unsub
  }, [clinicId, branchId])

  return { visits, loading, error }
}

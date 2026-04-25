import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PaymentMethod } from '@/features/checkout/services/complete-billing'

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
  paymentMethod?: PaymentMethod
  consultationNotes?: string
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

    const q = query(
      collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
      where('date', '==', today),
      where('status', '==', 'completed'),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => {
          const data = d.data()
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
            paymentMethod: (data.paymentMethod as PaymentMethod | undefined) ?? undefined,
            consultationNotes: data.consultationNotes ?? undefined,
            completedAt: data.updatedAt ?? null,
            date: data.date ?? today,
          } as CompletedVisit
        })

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

import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, type Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface AllVisit {
  id: string
  tokenDisplay: string
  tokenNumber: number
  petName: string
  ownerName: string
  ownerId: string
  doctorName: string
  doctorId: string
  status: string
  isEmergency: boolean
  complaints: string[]
  createdAt: Timestamp | null
}

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useAllVisits(clinicId: string | null, branchId: string | null) {
  const [visits, setVisits] = useState<AllVisit[]>([])
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
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            tokenDisplay: data.tokenDisplay ?? '',
            tokenNumber: data.tokenNumber ?? 0,
            petName: data.petName ?? '',
            ownerName: data.ownerName ?? '',
            ownerId: data.ownerId ?? '',
            doctorName: data.doctorName ?? '',
            doctorId: data.doctorId ?? '',
            status: data.status ?? 'waiting',
            isEmergency: data.isEmergency ?? false,
            complaints: data.complaints ?? [],
            createdAt: data.createdAt ?? null,
          } as AllVisit
        })

        all.sort((a, b) => {
          if (a.isEmergency && !b.isEmergency) return -1
          if (!a.isEmergency && b.isEmergency) return 1
          return a.tokenNumber - b.tokenNumber
        })

        setVisits(all)
        setLoading(false)
      },
      (err) => {
        console.error('All visits snapshot error:', err)
        setError('Failed to load visits.')
        setLoading(false)
      },
    )

    return unsub
  }, [clinicId, branchId])

  return { visits, loading, error }
}

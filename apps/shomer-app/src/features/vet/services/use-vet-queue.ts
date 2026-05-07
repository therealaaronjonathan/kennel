import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ConsultationDraft } from './consultation-draft'

export interface VetQueueEntry {
  id: string
  tokenNumber: number
  tokenDisplay: string
  petId: string
  petName: string
  ownerId: string
  ownerName: string
  doctorId: string
  status: string
  isEmergency: boolean
  service?: string
  complaints: string[]
  otherComplaintText?: string
  groomingServices?: string[]
  date: string
  consultationDraft?: ConsultationDraft
}

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useVetQueue(
  clinicId: string | null,
  branchId: string | null,
  doctorId: string | null,
) {
  const [entries, setEntries] = useState<VetQueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clinicId || !branchId || !doctorId) {
      setLoading(false)
      return
    }

    const today = getTodayString()

    const q = query(
      collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
      where('doctorId', '==', doctorId),
      where('date', '==', today),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as VetQueueEntry)
          .filter((v) => v.status !== 'completed' && v.status !== 'cancelled' && v.status !== 'billed')

        all.sort((a, b) => {
          if (a.isEmergency && !b.isEmergency) return -1
          if (!a.isEmergency && b.isEmergency) return 1
          return a.tokenNumber - b.tokenNumber
        })

        setEntries(all)
        setLoading(false)
      },
      (err) => {
        console.error('Vet queue snapshot error:', err)
        setError('Failed to load queue.')
        setLoading(false)
      },
    )

    return unsub
  }, [clinicId, branchId, doctorId])

  return { entries, loading, error }
}

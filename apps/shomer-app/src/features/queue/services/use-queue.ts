import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface QueueEntry {
  id: string
  tokenNumber: number
  tokenDisplay: string
  doctorId: string
  doctorName: string
  status: string
  isEmergency: boolean
  complaints: string[]
  date: string
  queuePosition: number
}

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useQueue(doctorId: string, clinicId: string, branchId: string) {
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!doctorId || !clinicId || !branchId) {
      setError('Invalid queue link. Please use the link from your check-in confirmation.')
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
          .map((d) => ({ id: d.id, ...d.data() }) as QueueEntry)

        all.sort((a, b) => {
          if (a.isEmergency && !b.isEmergency) return -1
          if (!a.isEmergency && b.isEmergency) return 1
          return a.tokenNumber - b.tokenNumber
        })

        setEntries(all)
        setLoading(false)
      },
      (err) => {
        console.error('Queue snapshot error:', err)
        setError('Failed to load queue. Check your connection.')
        setLoading(false)
      },
    )

    return unsub
  }, [doctorId, clinicId, branchId])

  return { entries, loading, error }
}

import { useEffect, useState } from 'react'
import {
  collectionGroup,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore'
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

export function useQueue(doctorId: string) {
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!doctorId) return

    const today = getTodayString()

    // Collection group query across all branches' visits
    // Requires Firestore index: visits — doctorId ASC, date ASC
    // Firestore security rules must allow public reads on visits
    const q = query(
      collectionGroup(db, 'visits'),
      where('doctorId', '==', doctorId),
      where('date', '==', today),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as QueueEntry)
          .filter((v) => v.status !== 'completed' && v.status !== 'cancelled')

        // Sort: emergencies first, then by tokenNumber
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
  }, [doctorId])

  return { entries, loading, error }
}

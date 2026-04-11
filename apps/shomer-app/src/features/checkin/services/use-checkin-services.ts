import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface CheckinServiceItem {
  id: string
  name: string
}

export function useCheckinServices(clinicId: string | null) {
  const [serviceTypes, setServiceTypes] = useState<string[]>([])
  const [servicesByType, setServicesByType] = useState<Record<string, CheckinServiceItem[]>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clinicId) return
    setLoading(true)

    const q = query(
      collection(db, `clinics/${clinicId}/services`),
      where('isActive', '==', true),
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const map: Record<string, CheckinServiceItem[]> = {}
        for (const d of snap.docs) {
          const t = (d.data().serviceType as string | undefined)?.trim()
          const name = (d.data().name as string | undefined)?.trim()
          if (!t || !name) continue
          if (!map[t]) map[t] = []
          map[t].push({ id: d.id, name })
        }

        // Sort service names within each type
        for (const type of Object.keys(map)) {
          map[type].sort((a, b) => a.name.localeCompare(b.name))
        }

        const types = Object.keys(map).sort((a, b) => a.localeCompare(b))
        setServiceTypes(types)
        setServicesByType(map)
        setLoading(false)
      },
      (err) => {
        console.error('useCheckinServices error:', err)
        setLoading(false)
      },
    )

    return unsub
  }, [clinicId])

  return { serviceTypes, servicesByType, loading }
}

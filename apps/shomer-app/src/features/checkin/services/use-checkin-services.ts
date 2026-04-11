import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface CheckinService {
  id: string
  name: string
  serviceType?: string
}

export function useCheckinServices(clinicId: string | null) {
  const [services, setServices] = useState<CheckinService[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clinicId) return
    setLoading(true)

    const q = query(
      collection(db, `clinics/${clinicId}/services`),
      where('isActive', '==', true),
    )

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => ({
          id: d.id,
          name: (d.data().name as string) ?? '',
          serviceType: (d.data().serviceType as string | undefined) ?? undefined,
        }))
        .filter((d) => d.name.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
      setServices(items)
      setLoading(false)
    })

    return unsub
  }, [clinicId])

  return { services, loading }
}

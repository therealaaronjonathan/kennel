import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ActiveClinicService {
  id: string
  name: string
  price: number
}

export function useActiveClinicServices(clinicId: string | null) {
  const [services, setServices] = useState<ActiveClinicService[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clinicId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, `clinics/${clinicId}/services`),
      where('isActive', '==', true),
    )

    const unsub = onSnapshot(q, (snap) => {
      setServices(
        snap.docs.map((d) => ({
          id: d.id,
          name: (d.data().name as string) ?? '',
          price: (d.data().price as number) ?? 0,
        })),
      )
      setLoading(false)
    })

    return unsub
  }, [clinicId])

  return { services, loading }
}

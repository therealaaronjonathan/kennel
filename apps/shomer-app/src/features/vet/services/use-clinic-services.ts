import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ClinicService {
  id: string
  name: string
  price: number
  serviceType?: string
}

export function useClinicServices(clinicId: string | null) {
  const [services, setServices] = useState<ClinicService[]>([])
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
        const items = snap.docs
          .map((d) => ({
            id: d.id,
            name: (d.data().name as string) ?? '',
            price: (d.data().price as number) ?? 0,
            serviceType: (d.data().serviceType as string | undefined)?.trim() || undefined,
          }))
          .filter((d) => d.name.length > 0)
          .sort((a, b) => a.name.localeCompare(b.name))
        setServices(items)
        setLoading(false)
      },
      (err) => {
        console.error('useClinicServices error:', err)
        setLoading(false)
      },
    )

    return unsub
  }, [clinicId])

  return { services, loading }
}

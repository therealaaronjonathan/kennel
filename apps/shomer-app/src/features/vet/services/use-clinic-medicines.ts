import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ClinicMedicine {
  id: string
  name: string
}

export function useClinicMedicines(clinicId: string | null) {
  const [medicines, setMedicines] = useState<ClinicMedicine[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clinicId) return
    setLoading(true)

    const q = query(
      collection(db, `clinics/${clinicId}/medicines`),
      where('isActive', '==', true),
    )

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, name: (d.data().name as string) ?? '' }))
        .filter((d) => d.name.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
      setMedicines(items)
      setLoading(false)
    })

    return unsub
  }, [clinicId])

  return { medicines, loading }
}

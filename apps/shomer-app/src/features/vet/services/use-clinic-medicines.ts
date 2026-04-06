import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type MedicineType = 'tablet' | 'syrup' | 'injection'

export interface ClinicMedicine {
  id: string
  name: string
  type: MedicineType
}

export function useClinicMedicines(clinicId: string | null) {
  const [medicines, setMedicines] = useState<ClinicMedicine[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clinicId) return
    setLoading(true)

    const q = query(
      collection(db, `clinics/${clinicId}/medicinesCatalog`),
      where('isActive', '==', true),
    )

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d) => ({
          id: d.id,
          name: (d.data().name as string) ?? '',
          type: (d.data().type as MedicineType) ?? 'tablet',
        }))
        .filter((d) => d.name.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
      setMedicines(items)
      setLoading(false)
    })

    return unsub
  }, [clinicId])

  return { medicines, loading }
}

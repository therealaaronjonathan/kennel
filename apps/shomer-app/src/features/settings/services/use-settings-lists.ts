import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface SettingsDiagnosis {
  id: string
  name: string
  isActive: boolean
}

export interface SettingsMedicine {
  id: string
  name: string
  isActive: boolean
}

export interface SettingsService {
  id: string
  name: string
  price: number
  isActive: boolean
}

export function useAllClinicDiagnoses(clinicId: string | null) {
  const [items, setItems] = useState<SettingsDiagnosis[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clinicId) return
    setLoading(true)

    const q = query(collection(db, `clinics/${clinicId}/diagnoses`), orderBy('name'))
    const unsub = onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
          isActive: d.data().isActive as boolean,
        })),
      )
      setLoading(false)
    })

    return unsub
  }, [clinicId])

  return { items, loading }
}

export function useAllClinicMedicines(clinicId: string | null) {
  const [items, setItems] = useState<SettingsMedicine[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clinicId) return
    setLoading(true)

    const q = query(collection(db, `clinics/${clinicId}/medicines`), orderBy('name'))
    const unsub = onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
          isActive: d.data().isActive as boolean,
        })),
      )
      setLoading(false)
    })

    return unsub
  }, [clinicId])

  return { items, loading }
}

export function useAllClinicServices(clinicId: string | null) {
  const [items, setItems] = useState<SettingsService[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clinicId) return
    setLoading(true)

    const q = query(collection(db, `clinics/${clinicId}/services`), orderBy('name'))
    const unsub = onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
          price: (d.data().price as number) ?? 0,
          isActive: d.data().isActive as boolean,
        })),
      )
      setLoading(false)
    })

    return unsub
  }, [clinicId])

  return { items, loading }
}

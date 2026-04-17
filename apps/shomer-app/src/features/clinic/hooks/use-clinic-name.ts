import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function useClinicName(clinicId: string | null): string | null {
  const [clinicName, setClinicName] = useState<string | null>(null)

  useEffect(() => {
    if (!clinicId) return
    getDoc(doc(db, `clinics/${clinicId}`))
      .then((snap) => {
        if (snap.exists()) setClinicName((snap.data().name as string) ?? null)
      })
      .catch(() => {})
  }, [clinicId])

  return clinicName
}

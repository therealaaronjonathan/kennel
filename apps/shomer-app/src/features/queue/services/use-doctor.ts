import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface DoctorProfile {
  name: string
  specialization?: string
  bio?: string
  photoUrl?: string
}

export function useDoctor(clinicId: string, doctorId: string) {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null)

  useEffect(() => {
    if (!clinicId || !doctorId) return
    getDoc(doc(db, `clinics/${clinicId}/doctors/${doctorId}`))
      .then((snap) => { if (snap.exists()) setDoctor(snap.data() as DoctorProfile) })
      .catch(console.error)
  }, [clinicId, doctorId])

  return doctor
}

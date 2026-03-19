import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface DiagnosisDetail {
  name: string
  notes: string
}

export interface MedicineDetail {
  name: string
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  days: number
}

export interface BillDetail {
  ownerPhone: string
  ownerEmail?: string
  diagnoses: DiagnosisDetail[]
  medicines: MedicineDetail[]
  vaccines: Array<{ name: string; batch?: string; nextDue?: string }>
}

export function useVisitBill(
  clinicId: string | null,
  branchId: string | null,
  visitId: string | null,
  ownerId: string | null,
) {
  const [detail, setDetail] = useState<BillDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clinicId || !branchId || !visitId || !ownerId) {
      setDetail(null)
      return
    }

    setLoading(true)
    setDetail(null)

    async function load() {
      const visitBase = `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`

      const [ownerSnap, diagSnap, presSnap, vacSnap] = await Promise.all([
        getDoc(doc(db, `clinics/${clinicId}/petOwners/${ownerId}`)),
        getDocs(collection(db, `${visitBase}/diagnoses`)),
        getDocs(collection(db, `${visitBase}/prescriptions`)),
        getDocs(collection(db, `${visitBase}/vaccines`)),
      ])

      const owner = ownerSnap.exists() ? ownerSnap.data() : {}

      const diagnoses: DiagnosisDetail[] = diagSnap.docs.map((d) => ({
        name: (d.data().name as string) ?? d.data().text ?? '',
        notes: (d.data().notes as string) ?? '',
      }))

      const medicines: MedicineDetail[] = presSnap.docs.map((d) => ({
        name: (d.data().name as string) ?? d.data().text ?? '',
        morning: (d.data().morning as boolean) ?? false,
        afternoon: (d.data().afternoon as boolean) ?? false,
        evening: (d.data().evening as boolean) ?? false,
        night: (d.data().night as boolean) ?? false,
        days: (d.data().days as number) ?? 1,
      }))

      setDetail({
        ownerPhone: owner.phone ?? '',
        ownerEmail: owner.email ?? undefined,
        diagnoses,
        medicines,
        vaccines: vacSnap.docs.map((d) => ({
          name: d.data().name ?? '',
          batch: d.data().batch ?? undefined,
          nextDue: d.data().nextDue ?? undefined,
        })),
      })
      setLoading(false)
    }

    load().catch((err) => {
      console.error('Error loading visit bill:', err)
      setLoading(false)
    })
  }, [clinicId, branchId, visitId, ownerId])

  return { detail, loading }
}

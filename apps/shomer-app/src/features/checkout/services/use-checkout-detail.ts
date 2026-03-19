import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface CheckoutDiagnosis {
  name: string
  notes: string
}

export interface CheckoutMedicine {
  name: string
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  days: number
}

export interface CheckoutVaccine {
  name: string
  batch?: string
  nextDue?: string
}

export interface CheckoutDetail {
  ownerPhone: string
  ownerEmail?: string
  ownerName: string
  diagnoses: CheckoutDiagnosis[]
  medicines: CheckoutMedicine[]
  vaccines: CheckoutVaccine[]
}

export function useCheckoutDetail(
  clinicId: string | null,
  branchId: string | null,
  visitId: string | null,
  ownerId: string | null,
) {
  const [detail, setDetail] = useState<CheckoutDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clinicId || !branchId || !visitId || !ownerId) {
      setDetail(null)
      return
    }

    setLoading(true)
    setDetail(null)

    const visitBase = `clinics/${clinicId}/branches/${branchId}/visits/${visitId}`

    Promise.all([
      getDoc(doc(db, `clinics/${clinicId}/petOwners/${ownerId}`)),
      getDocs(collection(db, `${visitBase}/diagnoses`)),
      getDocs(collection(db, `${visitBase}/prescriptions`)),
      getDocs(collection(db, `${visitBase}/vaccines`)),
    ])
      .then(([ownerSnap, diagSnap, presSnap, vacSnap]) => {
        const owner = ownerSnap.exists() ? ownerSnap.data() : {}
        setDetail({
          ownerPhone: (owner.phone as string) ?? '',
          ownerEmail: (owner.email as string) ?? undefined,
          ownerName: (owner.name as string) ?? '',
          diagnoses: diagSnap.docs.map((d) => ({
            name: (d.data().name as string) ?? '',
            notes: (d.data().notes as string) ?? '',
          })),
          medicines: presSnap.docs.map((d) => ({
            name: (d.data().name as string) ?? '',
            morning: (d.data().morning as boolean) ?? false,
            afternoon: (d.data().afternoon as boolean) ?? false,
            evening: (d.data().evening as boolean) ?? false,
            night: (d.data().night as boolean) ?? false,
            days: (d.data().days as number) ?? 1,
          })),
          vaccines: vacSnap.docs.map((d) => ({
            name: (d.data().name as string) ?? '',
            batch: (d.data().batch as string) ?? undefined,
            nextDue: (d.data().nextDue as string) ?? undefined,
          })),
        })
        setLoading(false)
      })
      .catch((err) => {
        console.error('Checkout detail error:', err)
        setLoading(false)
      })
  }, [clinicId, branchId, visitId, ownerId])

  return { detail, loading }
}

import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface PetDetail {
  name: string
  species: string
  breed?: string
  age?: number
  microchipNumber?: string
}

export interface OwnerDetail {
  name: string
  phone: string
  email?: string
}

export interface LastVisitSummary {
  visitId: string
  date: string
  diagnosis?: string
  medicines?: string
}

export interface VisitDetail {
  pet: PetDetail | null
  owner: OwnerDetail | null
  lastVisit: LastVisitSummary | null
}

export function useVisitDetail(
  clinicId: string | null,
  branchId: string | null,
  currentVisitId: string | null,
  petId: string | null,
  ownerId: string | null,
) {
  const [detail, setDetail] = useState<VisitDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clinicId || !branchId || !currentVisitId || !petId || !ownerId) {
      setDetail(null)
      return
    }

    setLoading(true)
    setDetail(null)

    async function load() {
      const [petSnap, ownerSnap] = await Promise.all([
        getDoc(doc(db, `clinics/${clinicId}/pets/${petId}`)),
        getDoc(doc(db, `clinics/${clinicId}/petOwners/${ownerId}`)),
      ])

      const pet = petSnap.exists() ? (petSnap.data() as PetDetail) : null
      const owner = ownerSnap.exists() ? (ownerSnap.data() as OwnerDetail) : null

      // Find the most recent completed visit for this pet (excluding current visit)
      const visitsSnap = await getDocs(
        query(
          collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
          where('petId', '==', petId),
          where('status', '==', 'completed'),
        ),
      )

      let lastVisit: LastVisitSummary | null = null

      if (!visitsSnap.empty) {
        // Sort client-side by date desc, exclude current visit
        const sorted = visitsSnap.docs
          .filter((d) => d.id !== currentVisitId)
          .sort((a, b) => b.data().date.localeCompare(a.data().date))

        if (sorted.length > 0) {
          const lastDoc = sorted[0]
          const lastVisitId = lastDoc.id

          // Fetch diagnosis and prescription subdocs
          const [diagSnap, presSnap] = await Promise.all([
            getDocs(collection(db, `clinics/${clinicId}/branches/${branchId}/visits/${lastVisitId}/diagnoses`)),
            getDocs(collection(db, `clinics/${clinicId}/branches/${branchId}/visits/${lastVisitId}/prescriptions`)),
          ])

          // New data model: diagnoses and prescriptions are arrays of structured docs
          const diagNames = diagSnap.docs
            .map((d) => (d.data().name as string) ?? d.data().text ?? '')
            .filter(Boolean)
            .join(', ')
          const medNames = presSnap.docs
            .map((d) => (d.data().name as string) ?? d.data().text ?? '')
            .filter(Boolean)
            .join(', ')

          lastVisit = {
            visitId: lastVisitId,
            date: lastDoc.data().date,
            diagnosis: diagNames || undefined,
            medicines: medNames || undefined,
          }
        }
      }

      setDetail({ pet, owner, lastVisit })
      setLoading(false)
    }

    load().catch((err) => {
      console.error('Error loading visit detail:', err)
      setLoading(false)
    })
  }, [clinicId, branchId, currentVisitId, petId, ownerId])

  return { detail, loading }
}

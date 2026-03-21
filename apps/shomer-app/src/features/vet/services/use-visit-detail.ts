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

export interface LastVisitDiagnosis {
  name: string
  notes?: string
}

export interface LastVisitMedicine {
  name: string
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  days: number
}

export interface LastVisitVaccine {
  name: string
  batch?: string
  nextDue?: string
}

export interface LastVisitSummary {
  visitId: string
  date: string
  consultationNotes?: string
  diagnoses: LastVisitDiagnosis[]
  medicines: LastVisitMedicine[]
  vaccines: LastVisitVaccine[]
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
        const sorted = visitsSnap.docs
          .filter((d) => d.id !== currentVisitId)
          .sort((a, b) => b.data().date.localeCompare(a.data().date))

        if (sorted.length > 0) {
          const lastDoc = sorted[0]
          const lastVisitId = lastDoc.id
          const visitData = lastDoc.data()

          // Fetch diagnoses, prescriptions, and vaccines subcollections in parallel
          const [diagSnap, presSnap, vaccineSnap] = await Promise.all([
            getDocs(collection(db, `clinics/${clinicId}/branches/${branchId}/visits/${lastVisitId}/diagnoses`)),
            getDocs(collection(db, `clinics/${clinicId}/branches/${branchId}/visits/${lastVisitId}/prescriptions`)),
            getDocs(collection(db, `clinics/${clinicId}/branches/${branchId}/visits/${lastVisitId}/vaccines`)),
          ])

          const diagnoses: LastVisitDiagnosis[] = diagSnap.docs
            .map((d) => ({
              name: (d.data().name as string) ?? '',
              notes: (d.data().notes as string) || undefined,
            }))
            .filter((d) => d.name.length > 0)

          const medicines: LastVisitMedicine[] = presSnap.docs
            .map((d) => ({
              name: (d.data().name as string) ?? '',
              morning: d.data().morning ?? false,
              afternoon: d.data().afternoon ?? false,
              evening: d.data().evening ?? false,
              night: d.data().night ?? false,
              days: d.data().days ?? 1,
            }))
            .filter((m) => m.name.length > 0)

          const vaccines: LastVisitVaccine[] = vaccineSnap.docs
            .map((d) => ({
              name: (d.data().name as string) ?? '',
              batch: (d.data().batch as string) || undefined,
              nextDue: (d.data().nextDue as string) || undefined,
            }))
            .filter((v) => v.name.length > 0)

          lastVisit = {
            visitId: lastVisitId,
            date: visitData.date,
            consultationNotes: (visitData.consultationNotes as string) || undefined,
            diagnoses,
            medicines,
            vaccines,
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

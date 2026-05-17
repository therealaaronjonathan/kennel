import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  sumPayments,
  type PaymentEntry,
} from '@/features/checkout/services/complete-billing'

export interface PetDetail {
  name: string
  species: string
  speciesName?: string
  breed?: string
  dateOfBirth?: string
  color?: string
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

export type MedicineType = 'tablet' | 'syrup' | 'other'

export interface LastVisitMedicine {
  name: string
  type?: MedicineType
  quantity?: string
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  days: number
  mealTiming?: 'before' | 'after'
}

export interface LastVisitVaccine {
  name: string
  batch?: string
  nextDue?: string
}

export interface LastVisitService {
  name: string
  price: number
  quantity?: number
}

export interface LastVisitSummary {
  visitId: string
  date: string
  doctorName?: string
  service?: string
  isEmergency?: boolean
  complaints: string[]
  otherComplaintText?: string
  consultationNotes?: string
  diagnoses: LastVisitDiagnosis[]
  medicines: LastVisitMedicine[]
  vaccines: LastVisitVaccine[]
  services: LastVisitService[]
  billAmount?: number
  payments?: PaymentEntry[]
  amountPaid?: number
  status?: string
  petWeightKg?: number
  petTemperatureF?: number
}

export interface EarlierVisitSummary {
  visitId: string
  date: string
  doctorName?: string
  service?: string
  isEmergency?: boolean
  complaints: string[]
  billAmount?: number
  payments?: PaymentEntry[]
  amountPaid?: number
  status?: string
}

export interface VisitDetail {
  pet: PetDetail | null
  owner: OwnerDetail | null
  lastVisit: LastVisitSummary | null
  earlierVisits: EarlierVisitSummary[]
}

const PAST_STATUSES = new Set(['completed', 'billed'])

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

      // Fetch ALL past visits for this pet at this branch — drop the
      // status='completed' filter so billed visits aren't silently hidden.
      const visitsSnap = await getDocs(
        query(
          collection(db, `clinics/${clinicId}/branches/${branchId}/visits`),
          where('petId', '==', petId),
        ),
      )

      const sortedPast = visitsSnap.docs
        .filter(
          (d) =>
            d.id !== currentVisitId &&
            PAST_STATUSES.has((d.data().status as string) ?? ''),
        )
        .sort((a, b) => (b.data().date as string).localeCompare(a.data().date as string))

      let lastVisit: LastVisitSummary | null = null
      const earlierVisits: EarlierVisitSummary[] = []

      if (sortedPast.length > 0) {
        const lastDoc = sortedPast[0]
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
            type: (d.data().type as MedicineType | undefined) ?? undefined,
            quantity: (d.data().quantity as string | undefined) ?? undefined,
            morning: d.data().morning ?? false,
            afternoon: d.data().afternoon ?? false,
            evening: d.data().evening ?? false,
            night: d.data().night ?? false,
            days: d.data().days ?? 1,
            mealTiming: (d.data().mealTiming as 'before' | 'after' | undefined) ?? undefined,
          }))
          .filter((m) => m.name.length > 0)

        const vaccines: LastVisitVaccine[] = vaccineSnap.docs
          .map((d) => ({
            name: (d.data().name as string) ?? '',
            batch: (d.data().batch as string) || undefined,
            nextDue: (d.data().nextDue as string) || undefined,
          }))
          .filter((v) => v.name.length > 0)

        const services: LastVisitService[] = Array.isArray(visitData.services)
          ? (visitData.services as LastVisitService[]).map((s) => ({
              name: s.name,
              price: s.price,
              quantity: s.quantity,
            }))
          : []

        const lastPayments = Array.isArray(visitData.payments)
          ? (visitData.payments as PaymentEntry[])
          : undefined

        lastVisit = {
          visitId: lastVisitId,
          date: visitData.date,
          doctorName: (visitData.doctorName as string) || undefined,
          service: (visitData.service as string) || undefined,
          isEmergency: !!visitData.isEmergency,
          complaints: (visitData.complaints as string[]) ?? [],
          otherComplaintText: (visitData.otherComplaintText as string) || undefined,
          consultationNotes: (visitData.consultationNotes as string) || undefined,
          diagnoses,
          medicines,
          vaccines,
          services,
          billAmount: typeof visitData.billAmount === 'number' ? visitData.billAmount : undefined,
          payments: lastPayments,
          amountPaid:
            typeof visitData.amountPaid === 'number'
              ? visitData.amountPaid
              : sumPayments(lastPayments),
          status: (visitData.status as string) || undefined,
          petWeightKg: typeof visitData.petWeightKg === 'number' ? visitData.petWeightKg : undefined,
          petTemperatureF: typeof visitData.petTemperatureF === 'number' ? visitData.petTemperatureF : undefined,
        }

        // Build summary list of all earlier (older than `lastVisit`) visits.
        for (let i = 1; i < sortedPast.length; i++) {
          const d = sortedPast[i]
          const data = d.data()
          const earlierPayments = Array.isArray(data.payments)
            ? (data.payments as PaymentEntry[])
            : undefined
          earlierVisits.push({
            visitId: d.id,
            date: data.date as string,
            doctorName: (data.doctorName as string) || undefined,
            service: (data.service as string) || undefined,
            isEmergency: !!data.isEmergency,
            complaints: (data.complaints as string[]) ?? [],
            billAmount: typeof data.billAmount === 'number' ? data.billAmount : undefined,
            payments: earlierPayments,
            amountPaid:
              typeof data.amountPaid === 'number'
                ? data.amountPaid
                : sumPayments(earlierPayments),
            status: (data.status as string) || undefined,
          })
        }
      }

      setDetail({ pet, owner, lastVisit, earlierVisits })
      setLoading(false)
    }

    load().catch((err) => {
      console.error('Error loading visit detail:', err)
      setLoading(false)
    })
  }, [clinicId, branchId, currentVisitId, petId, ownerId])

  return { detail, loading }
}

import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  getDocs,
  query,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  sumPayments,
  type PaymentEntry,
  type ServiceEntry,
} from '@/features/checkout/services/complete-billing'
import type { LastVisitSummary } from '@/features/vet/services/use-visit-detail'
import { parseVisitDiscount, type VisitDiscount } from '@/features/checkout/services/discount'
import { useClinicBranches, type ClinicBranch } from './use-clinic-branches'

const FINISHED = new Set(['completed', 'billed'])

export interface PetHistoryVisit {
  id: string
  branchId: string
  branchName: string
  tokenDisplay: string
  petName: string
  ownerName: string
  ownerId: string
  petId: string
  doctorName: string
  doctorId: string
  status: string
  isEmergency: boolean
  service?: string
  complaints: string[]
  otherComplaintText?: string
  consultationNotes?: string
  services?: ServiceEntry[]
  billAmount?: number
  discount?: VisitDiscount
  payments?: PaymentEntry[]
  amountPaid?: number
  petWeightKg?: number
  petTemperatureF?: number
  date: string
  billedAt: Timestamp | null
  updatedAt: Timestamp | null
  createdAt: Timestamp | null
}

export interface PetHistoryKpis {
  totalVisits: number
  totalPaid: number
  outstanding: number
}

export function computePetHistoryKpis(visits: PetHistoryVisit[]): PetHistoryKpis {
  let totalPaid = 0
  let outstanding = 0
  for (const v of visits) {
    const paid = v.amountPaid ?? 0
    const bill = v.billAmount ?? 0
    totalPaid += paid
    outstanding += Math.max(0, bill - paid)
  }
  return { totalVisits: visits.length, totalPaid, outstanding }
}

function recencyMs(v: PetHistoryVisit): number {
  return v.billedAt?.toMillis() ?? v.updatedAt?.toMillis() ?? v.createdAt?.toMillis() ?? 0
}

function sortHistory(a: PetHistoryVisit, b: PetHistoryVisit): number {
  const dateCmp = (b.date ?? '').localeCompare(a.date ?? '')
  if (dateCmp !== 0) return dateCmp
  return recencyMs(b) - recencyMs(a)
}

function mapVisit(
  id: string,
  data: Record<string, unknown>,
  branch: ClinicBranch,
): PetHistoryVisit {
  const payments = Array.isArray(data.payments)
    ? (data.payments as PaymentEntry[])
    : undefined
  return {
    id,
    branchId: branch.id,
    branchName: branch.name,
    tokenDisplay: (data.tokenDisplay as string) ?? '',
    petName: (data.petName as string) ?? '',
    ownerName: (data.ownerName as string) ?? '',
    ownerId: (data.ownerId as string) ?? '',
    petId: (data.petId as string) ?? '',
    doctorName: (data.doctorName as string) ?? '',
    doctorId: (data.doctorId as string) ?? '',
    status: (data.status as string) ?? 'waiting',
    isEmergency: !!data.isEmergency,
    service: (data.service as string) || undefined,
    complaints: (data.complaints as string[]) ?? [],
    otherComplaintText: (data.otherComplaintText as string) || undefined,
    consultationNotes: (data.consultationNotes as string) || undefined,
    services: Array.isArray(data.services) ? (data.services as ServiceEntry[]) : undefined,
    billAmount: typeof data.billAmount === 'number' ? data.billAmount : undefined,
    discount: parseVisitDiscount(data.discount),
    payments,
    amountPaid:
      typeof data.amountPaid === 'number' ? data.amountPaid : sumPayments(payments),
    petWeightKg: typeof data.petWeightKg === 'number' ? data.petWeightKg : undefined,
    petTemperatureF:
      typeof data.petTemperatureF === 'number' ? data.petTemperatureF : undefined,
    date: (data.date as string) ?? '',
    billedAt: (data.billedAt as Timestamp | undefined) ?? null,
    updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
    createdAt: (data.createdAt as Timestamp | undefined) ?? null,
  }
}

export async function loadLastVisitSummary(
  clinicId: string,
  visit: PetHistoryVisit,
): Promise<LastVisitSummary> {
  const base = `clinics/${clinicId}/branches/${visit.branchId}/visits/${visit.id}`
  const [diagSnap, presSnap, vaccineSnap] = await Promise.all([
    getDocs(collection(db, `${base}/diagnoses`)),
    getDocs(collection(db, `${base}/prescriptions`)),
    getDocs(collection(db, `${base}/vaccines`)),
  ])

  return {
    visitId: visit.id,
    date: visit.date,
    doctorName: visit.doctorName || undefined,
    service: visit.service,
    isEmergency: visit.isEmergency,
    complaints: visit.complaints,
    otherComplaintText: visit.otherComplaintText,
    consultationNotes: visit.consultationNotes,
    diagnoses: diagSnap.docs
      .map((d) => ({
        name: (d.data().name as string) ?? '',
        notes: (d.data().notes as string) || undefined,
      }))
      .filter((d) => d.name.length > 0),
    medicines: presSnap.docs
      .map((d) => ({
        name: (d.data().name as string) ?? '',
        type: d.data().type,
        quantity: (d.data().quantity as string | undefined) ?? undefined,
        morning: d.data().morning ?? false,
        afternoon: d.data().afternoon ?? false,
        evening: d.data().evening ?? false,
        night: d.data().night ?? false,
        days: d.data().days ?? 1,
        mealTiming: d.data().mealTiming,
      }))
      .filter((m) => m.name.length > 0),
    vaccines: vaccineSnap.docs
      .map((d) => ({
        name: (d.data().name as string) ?? '',
        batch: (d.data().batch as string) || undefined,
        nextDue: (d.data().nextDue as string) || undefined,
      }))
      .filter((v) => v.name.length > 0),
    services: (visit.services ?? []).map((s) => ({
      name: s.name,
      price: s.price,
      quantity: s.quantity,
    })),
    billAmount: visit.billAmount,
    discount: visit.discount,
    branchId: visit.branchId,
    payments: visit.payments,
    amountPaid: visit.amountPaid,
    status: visit.status,
    petWeightKg: visit.petWeightKg,
    petTemperatureF: visit.petTemperatureF,
  }
}

export function usePetVisitHistory(
  clinicId: string | null,
  petId: string | null,
  branchFilter: string | null,
) {
  const { data: branches = [], isLoading: branchesLoading } = useClinicBranches(clinicId)
  const [allVisits, setAllVisits] = useState<PetHistoryVisit[]>([])
  const [lastVisit, setLastVisit] = useState<LastVisitSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clinicId || !petId || branchesLoading) {
      if (!petId) {
        setAllVisits([])
        setLastVisit(null)
      }
      return
    }
    if (branches.length === 0) {
      setAllVisits([])
      setLastVisit(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all(
      branches.map(async (branch) => {
        const snap = await getDocs(
          query(
            collection(db, `clinics/${clinicId}/branches/${branch.id}/visits`),
            where('petId', '==', petId),
          ),
        )
        return snap.docs
          .map((d) => mapVisit(d.id, d.data() as Record<string, unknown>, branch))
          .filter((v) => FINISHED.has(v.status))
      }),
    )
      .then((groups) => {
        if (cancelled) return
        setAllVisits(groups.flat().sort(sortHistory))
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Pet visit history query error:', err)
        setAllVisits([])
        setError('Failed to load visit history.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [clinicId, petId, branches, branchesLoading])

  const visits = useMemo(() => {
    if (!branchFilter) return allVisits
    return allVisits.filter((v) => v.branchId === branchFilter)
  }, [allVisits, branchFilter])

  const kpis = useMemo(() => computePetHistoryKpis(visits), [visits])

  const latest = visits[0] ?? null

  useEffect(() => {
    if (!clinicId || !latest) {
      setLastVisit(null)
      return
    }
    let cancelled = false
    loadLastVisitSummary(clinicId, latest)
      .then((summary) => {
        if (!cancelled) setLastVisit(summary)
      })
      .catch((err) => {
        console.error('Last visit summary error:', err)
        if (!cancelled) setLastVisit(null)
      })
    return () => {
      cancelled = true
    }
  }, [clinicId, latest])

  return {
    visits,
    allVisits,
    kpis,
    lastVisit,
    lastVisitBranchName: latest?.branchName ?? null,
    loading: loading || branchesLoading,
    error,
    branches,
  }
}

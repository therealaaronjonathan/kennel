import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useDoctors } from '@/features/checkin/services/use-doctors'
import type { DiscountApprover } from './discount'

export interface ApproverOption extends DiscountApprover {}

export function useApprovers(clinicId: string | null, branchId: string | null) {
  const doctorsQuery = useDoctors(clinicId ?? '', branchId ?? '')

  const staffQuery = useQuery({
    queryKey: ['branch-staff', clinicId, branchId],
    enabled: !!clinicId && !!branchId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ApproverOption[]> => {
      const snap = await getDocs(
        query(
          collection(db, `clinics/${clinicId}/staff`),
          where('branchIds', 'array-contains', branchId),
        ),
      )
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as {
          id: string
          name?: string
          role?: string
          isActive?: boolean
        })
        .filter((s) => {
          if (s.isActive === false || !s.name) return false
          const role = s.role ?? 'receptionist'
          return role !== 'admin' && role !== 'owner' && role !== 'doctor'
        })
        .map((s) => ({ id: s.id, name: s.name as string, role: 'receptionist' as const }))
    },
  })

  const doctors: ApproverOption[] = (doctorsQuery.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    role: 'doctor' as const,
  }))
  const doctorIds = new Set(doctors.map((d) => d.id))
  const staff = (staffQuery.data ?? [])
    .filter((s) => !doctorIds.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name))
  const options = [...doctors, ...staff].sort((a, b) => a.name.localeCompare(b.name))

  return {
    options,
    doctors: doctors.sort((a, b) => a.name.localeCompare(b.name)),
    staff,
    loading: doctorsQuery.isLoading || staffQuery.isLoading,
  }
}

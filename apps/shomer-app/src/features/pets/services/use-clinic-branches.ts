import { useQuery } from '@tanstack/react-query'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ClinicBranch {
  id: string
  name: string
  isActive: boolean
}

export function useClinicBranches(clinicId: string | null) {
  return useQuery({
    queryKey: ['clinicBranches', clinicId ?? ''],
    queryFn: async (): Promise<ClinicBranch[]> => {
      if (!clinicId) return []
      const snap = await getDocs(collection(db, `clinics/${clinicId}/branches`))
      return snap.docs
        .map((d) => {
          const data = d.data()
          return {
            id: d.id,
            name: (data.name as string) ?? d.id,
            isActive: data.isActive !== false,
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    enabled: !!clinicId,
    staleTime: 60_000,
  })
}

import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Doctor } from '../types'

export function useDoctors(clinicId: string, branchId: string) {
  return useQuery({
    queryKey: ['doctors', clinicId, branchId],
    queryFn: async (): Promise<Doctor[]> => {
      const q = query(
        collection(
          db,
          `clinics/${clinicId}/branches/${branchId}/doctors`,
        ),
        where('isActive', '==', true),
      )
      const snap = await getDocs(q)
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Doctor)
    },
    enabled: !!clinicId && !!branchId,
    staleTime: 5 * 60 * 1000,
  })
}

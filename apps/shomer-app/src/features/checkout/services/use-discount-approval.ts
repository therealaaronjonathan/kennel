import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { DiscountApprover } from './discount'

export function useDiscountApproval(
  clinicId: string | null,
  branchId: string | null,
  visitId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['discount-approval', clinicId, branchId, visitId],
    enabled: enabled && !!clinicId && !!branchId && !!visitId,
    queryFn: async (): Promise<DiscountApprover | null> => {
      const snap = await getDoc(
        doc(db, `clinics/${clinicId}/branches/${branchId}/discountApprovals/${visitId}`),
      )
      if (!snap.exists()) return null
      const data = snap.data()
      const role = data.approvedByRole === 'doctor' ? 'doctor' : 'receptionist'
      const name = typeof data.approvedByName === 'string' ? data.approvedByName : ''
      const id = typeof data.approvedById === 'string' ? data.approvedById : ''
      if (!name || !id) return null
      return { id, name, role }
    },
  })
}

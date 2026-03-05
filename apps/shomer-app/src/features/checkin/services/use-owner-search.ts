import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { PetOwner, Pet } from '../types'

export interface OwnerSearchResult {
  owner: PetOwner
  pets: Pet[]
}

export function useOwnerSearch(
  clinicId: string,
  branchId: string,
  searchTerm: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['petOwners', clinicId, branchId, searchTerm],
    queryFn: async (): Promise<OwnerSearchResult | null> => {
      const col = collection(
        db,
        `clinics/${clinicId}/branches/${branchId}/petOwners`,
      )

      const field = searchTerm.includes('@') ? 'email' : 'phone'
      const q = query(col, where(field, '==', searchTerm.trim()))
      const snap = await getDocs(q)

      if (snap.empty) return null

      const owner = { id: snap.docs[0].id, ...snap.docs[0].data() } as PetOwner

      const petsSnap = await getDocs(
        collection(
          db,
          `clinics/${clinicId}/branches/${branchId}/petOwners/${owner.id}/pets`,
        ),
      )
      const pets = petsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Pet,
      )

      return { owner, pets }
    },
    enabled: enabled && !!searchTerm.trim() && !!clinicId && !!branchId,
    retry: false,
    staleTime: 0,
  })
}

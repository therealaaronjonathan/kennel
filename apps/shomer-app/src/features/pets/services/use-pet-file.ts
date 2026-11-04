import { useQuery } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Pet, PetOwner } from '@/features/checkin/types'

export function usePetFile(clinicId: string | null, petId: string | undefined) {
  return useQuery({
    queryKey: ['petFile', clinicId ?? '', petId ?? ''],
    queryFn: async (): Promise<{ pet: Pet; owner: PetOwner } | null> => {
      if (!clinicId || !petId) return null
      const petSnap = await getDoc(doc(db, `clinics/${clinicId}/pets/${petId}`))
      if (!petSnap.exists()) return null
      const pet = { id: petSnap.id, ...petSnap.data() } as Pet
      const ownerSnap = await getDoc(doc(db, `clinics/${clinicId}/petOwners/${pet.ownerId}`))
      if (!ownerSnap.exists()) {
        return {
          pet,
          owner: {
            id: pet.ownerId,
            clinicId,
            branchIds: [],
            name: 'Unknown owner',
            phone: '',
            createdAt: pet.createdAt,
            updatedAt: pet.updatedAt,
          },
        }
      }
      return {
        pet,
        owner: { id: ownerSnap.id, ...ownerSnap.data() } as PetOwner,
      }
    },
    enabled: !!clinicId && !!petId,
    staleTime: 30_000,
  })
}

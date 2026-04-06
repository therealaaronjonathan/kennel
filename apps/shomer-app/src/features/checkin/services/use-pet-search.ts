import { useQuery } from '@tanstack/react-query'
import { collection, documentId, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Pet, PetOwner, PetWithOwner } from '../types'

export type SpeciesFilter = 'dog' | 'cat' | 'other'

export function usePetSearch(
  clinicId: string,
  petName: string,
  breed: string,
  species: SpeciesFilter,
  enabled: boolean,
  ownerPhone?: string, // full E.164 string e.g. "+919876543210"
) {
  return useQuery({
    queryKey: ['petSearch', clinicId, petName, breed, species, ownerPhone ?? ''],
    queryFn: async (): Promise<PetWithOwner[]> => {
      const nameLower = petName.toLowerCase().trim()

      // Prefix range query on petNameLower
      const petsSnap = await getDocs(
        query(
          collection(db, `clinics/${clinicId}/pets`),
          where('petNameLower', '>=', nameLower),
          where('petNameLower', '<=', nameLower + '\uf8ff'),
        ),
      )

      let pets = petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pet)

      // Client-side species filter
      if (species === 'dog') {
        pets = pets.filter((p) => p.species === 'dog')
      } else if (species === 'cat') {
        pets = pets.filter((p) => p.species === 'cat')
      } else {
        // 'other' = everything that is not dog or cat
        pets = pets.filter((p) => p.species !== 'dog' && p.species !== 'cat')
      }

      // Client-side breed filter (Firestore can't range-query two fields simultaneously)
      if (breed.trim()) {
        const breedLower = breed.toLowerCase().trim()
        pets = pets.filter((p) => p.breed?.toLowerCase().includes(breedLower))
      }

      if (pets.length === 0) return []

      // Batch-fetch owners (Firestore 'in' supports up to 30 items per query)
      const ownerIds = [...new Set(pets.map((p) => p.ownerId))]
      const owners: PetOwner[] = []
      for (let i = 0; i < ownerIds.length; i += 30) {
        const batch = ownerIds.slice(i, i + 30)
        const snap = await getDocs(
          query(
            collection(db, `clinics/${clinicId}/petOwners`),
            where(documentId(), 'in', batch),
          ),
        )
        owners.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PetOwner))
      }

      const ownerMap = new Map(owners.map((o) => [o.id, o]))
      return pets
        .map((pet) => ({ pet, owner: ownerMap.get(pet.ownerId) }))
        .filter((r): r is PetWithOwner => r.owner !== undefined)
        .filter((r) => !ownerPhone || r.owner.phone === ownerPhone)
    },
    enabled: enabled && !!petName.trim() && !!clinicId,
    retry: false,
    staleTime: 0,
  })
}

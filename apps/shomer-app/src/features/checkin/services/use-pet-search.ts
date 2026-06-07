import { useQuery } from '@tanstack/react-query'
import { collection, documentId, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Pet, PetOwner, PetWithOwner } from '../types'

export type SpeciesFilter = 'dog' | 'cat' | 'other'

async function searchByPhone(clinicId: string, ownerPhone: string): Promise<PetWithOwner[]> {
  const ownerSnap = await getDocs(
    query(
      collection(db, `clinics/${clinicId}/petOwners`),
      where('phone', '==', ownerPhone),
    ),
  )
  if (ownerSnap.empty) return []

  const owners = ownerSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as PetOwner)
  const ownerMap = new Map(owners.map((o) => [o.id, o]))

  const allPets: Pet[] = []
  for (const owner of owners) {
    const petsSnap = await getDocs(
      query(
        collection(db, `clinics/${clinicId}/pets`),
        where('ownerId', '==', owner.id),
      ),
    )
    allPets.push(...petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pet))
  }

  return allPets
    .map((pet) => ({ pet, owner: ownerMap.get(pet.ownerId)! }))
    .filter((r): r is PetWithOwner => r.owner !== undefined)
}

export function usePetSearch(
  clinicId: string,
  petName: string,
  breed: string,
  species: SpeciesFilter,
  enabled: boolean,
  ownerPhone?: string,
) {
  const phoneOnly = !petName.trim() && !!ownerPhone

  return useQuery({
    queryKey: ['petSearch', clinicId, petName, breed, species, ownerPhone ?? '', phoneOnly],
    queryFn: async (): Promise<PetWithOwner[]> => {
      // Phone-only: find owner by phone, return all their pets
      if (phoneOnly && ownerPhone) {
        return searchByPhone(clinicId, ownerPhone)
      }

      // Name-first path (existing)
      const nameLower = petName.toLowerCase().trim()

      const petsSnap = await getDocs(
        query(
          collection(db, `clinics/${clinicId}/pets`),
          where('petNameLower', '>=', nameLower),
          where('petNameLower', '<=', nameLower + ''),
        ),
      )

      let pets = petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Pet)

      if (species === 'dog') {
        pets = pets.filter((p) => p.species === 'dog')
      } else if (species === 'cat') {
        pets = pets.filter((p) => p.species === 'cat')
      } else {
        pets = pets.filter((p) => p.species !== 'dog' && p.species !== 'cat')
      }

      if (breed.trim()) {
        const breedLower = breed.toLowerCase().trim()
        pets = pets.filter((p) => p.breed?.toLowerCase().includes(breedLower))
      }

      if (pets.length === 0) return []

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
    enabled: enabled && (!!petName.trim() || !!ownerPhone) && !!clinicId,
    retry: false,
    staleTime: 0,
  })
}

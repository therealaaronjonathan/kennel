import { DOG_BREEDS, CAT_BREEDS } from './breeds'

export function useBreeds(species: 'dog' | 'cat' | 'other'): string[] {
  if (species === 'dog') return DOG_BREEDS
  if (species === 'cat') return CAT_BREEDS
  return []
}

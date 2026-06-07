import { useState } from 'react'
import { Search, PawPrint, User, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePetSearch, type SpeciesFilter } from '../services/use-pet-search'
import { useBreeds } from '../services/use-breeds'
import { BreedSelect } from './breed-select'
import type { PetWithOwner } from '../types'

interface PetSearchStepProps {
  clinicId: string
  onFound: (result: PetWithOwner) => void
  onNotFound: (petName: string, breed: string, species: SpeciesFilter, ownerPhone: string) => void
}

const SPECIES_OPTIONS: { value: SpeciesFilter; label: string }[] = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'other', label: 'Other' },
]

function speciesDisplayLabel(species: string, speciesName?: string): string {
  if (species === 'other' && speciesName) return speciesName
  return species.charAt(0).toUpperCase() + species.slice(1)
}

export function PetSearchStep({ clinicId, onFound, onNotFound }: PetSearchStepProps) {
  const [phoneDigits, setPhoneDigits] = useState('')
  const [selectedSpecies, setSelectedSpecies] = useState<SpeciesFilter | null>(null)
  const [petName, setPetName] = useState('')
  const [breed, setBreed] = useState('')
  const [submitted, setSubmitted] = useState<{
    petName: string
    breed: string
    species: SpeciesFilter
    ownerPhone: string
    phoneOnly: boolean
  } | null>(null)

  const breeds = useBreeds(selectedSpecies ?? 'dog')

  const phoneComplete = phoneDigits.length === 10
  const phonePartial = phoneDigits.length > 0 && phoneDigits.length < 10
  const ownerPhone = phoneComplete ? '+91' + phoneDigits : ''

  // Phone-only: phone is complete and no pet name typed
  const isPhoneOnly = phoneComplete && !petName.trim()
  // Name search: species selected + pet name entered + no partial phone
  const isNameSearch = !!selectedSpecies && !!petName.trim() && !phonePartial
  const canSearch = (isPhoneOnly || isNameSearch) && !phonePartial

  const { data: results, isLoading, isFetched } = usePetSearch(
    clinicId,
    submitted?.petName ?? '',
    submitted?.breed ?? '',
    submitted?.species ?? 'dog',
    !!submitted,
    submitted?.ownerPhone || undefined,
  )

  function handleSearch() {
    if (!canSearch) return
    if (isPhoneOnly) {
      setSubmitted({ petName: '', breed: '', species: selectedSpecies ?? 'dog', ownerPhone, phoneOnly: true })
    } else {
      setSubmitted({ petName: petName.trim(), breed: breed.trim(), species: selectedSpecies!, ownerPhone, phoneOnly: false })
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  const noResults = isFetched && submitted && results?.length === 0

  return (
    <div className="space-y-5">
      {/* Phone — primary, always visible */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted flex items-center gap-1.5">
          <Phone size={10} />
          Owner Phone
        </p>
        <div className={cn(
          'flex items-center rounded-[4px] border overflow-hidden transition-colors',
          phonePartial ? 'border-danger' : 'border-border-base',
        )}>
          <span className="flex-shrink-0 select-none border-r border-border-base bg-surface-2 px-3 py-[9px] text-[13px] font-semibold text-muted">
            +91
          </span>
          <input
            type="tel"
            placeholder="98765 43210"
            value={phoneDigits}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
              setPhoneDigits(digits)
              setSubmitted(null)
            }}
            onKeyDown={handleKeyDown}
            inputMode="numeric"
            autoFocus
            className="flex-1 bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>
        {phonePartial && (
          <p className="text-[11px] text-danger">Enter the full 10-digit number</p>
        )}
        {phoneComplete && !petName.trim() && (
          <p className="text-[11px] text-success font-medium">
            Ready — tap Search to look up all pets for this number
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border-base" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
          or narrow by pet name
        </span>
        <div className="flex-1 h-px bg-border-base" />
      </div>

      {/* Species toggle */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Species{!isPhoneOnly && <span className="text-danger"> *</span>}
        </p>
        <div className="grid grid-cols-3 rounded-[4px] border border-border-base overflow-hidden">
          {SPECIES_OPTIONS.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setSelectedSpecies(opt.value)
                setBreed('')
                setSubmitted(null)
              }}
              className={cn(
                'py-[9px] text-[13px] font-semibold transition-colors',
                i < SPECIES_OPTIONS.length - 1 && 'border-r border-border-base',
                selectedSpecies === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted hover:bg-surface-2 hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Name + breed — only once species selected */}
      {selectedSpecies && (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Pet Name{!isPhoneOnly && <span className="text-danger"> *</span>}
            </p>
            <input
              type="text"
              placeholder="e.g. Max"
              value={petName}
              onChange={(e) => { setPetName(e.target.value); setSubmitted(null) }}
              onKeyDown={handleKeyDown}
              className="w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Breed{' '}
              <span className="text-muted font-normal normal-case">(optional)</span>
            </p>
            {selectedSpecies !== 'other' ? (
              <BreedSelect
                value={breed}
                onChange={(v) => { setBreed(v); setSubmitted(null) }}
                breeds={breeds}
                placeholder={selectedSpecies === 'cat' ? 'e.g. Persian' : 'e.g. Golden Retriever'}
              />
            ) : (
              <input
                type="text"
                placeholder="e.g. Mix, Dwarf…"
                value={breed}
                onChange={(e) => { setBreed(e.target.value); setSubmitted(null) }}
                onKeyDown={handleKeyDown}
                className="w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
              />
            )}
          </div>
        </div>
      )}

      {/* Search button */}
      <button
        type="button"
        onClick={handleSearch}
        disabled={!canSearch || isLoading}
        className={cn(
          'flex w-full items-center justify-center gap-1.5 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white transition-opacity',
          !canSearch || isLoading ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-85',
        )}
      >
        <Search size={14} />
        {isLoading ? 'Searching…' : 'Search'}
      </button>

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            {results.length} match{results.length > 1 ? 'es' : ''} found
          </p>
          {results.map(({ pet, owner }) => (
            <button
              key={pet.id}
              type="button"
              onClick={() => onFound({ pet, owner })}
              className="w-full rounded-[4px] border border-border-base bg-surface p-4 text-left hover:border-primary hover:bg-surface-2 transition-colors space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-primary/10 flex-shrink-0">
                  <PawPrint size={13} className="text-primary" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{pet.name}</p>
                  <p className="text-[11px] text-muted capitalize">
                    {speciesDisplayLabel(pet.species, pet.speciesName)}
                    {pet.breed ? ` · ${pet.breed}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pl-9">
                <User size={11} className="text-muted flex-shrink-0" />
                <span className="text-[12px] text-muted">
                  {owner.name} · {owner.phone}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Register new — shown after results too */}
      {results && results.length > 0 && submitted && (
        <div className="rounded-[4px] border border-border-base bg-surface p-4 space-y-2">
          <p className="text-[12px] text-muted">Not seeing the right patient?</p>
          <button
            type="button"
            onClick={() => onNotFound(submitted.petName, submitted.breed, submitted.species, submitted.ownerPhone)}
            className="rounded-[4px] border border-primary px-4 py-[9px] text-[13px] font-semibold text-primary hover:opacity-85 transition-opacity"
          >
            Register as new patient
          </button>
        </div>
      )}

      {/* No results */}
      {noResults && (
        <div className="rounded-[4px] border border-border-base bg-surface p-4 space-y-3">
          {submitted?.phoneOnly ? (
            <>
              <p className="text-[13px] font-medium text-foreground">
                No pets found for{' '}
                <span className="font-semibold">+91 {phoneDigits}</span>
              </p>
              <p className="text-[11px] text-muted">
                The number may not be registered. Register a new owner and pet to continue.
              </p>
            </>
          ) : (
            <>
              <p className="text-[13px] font-medium text-foreground">
                No pet found matching{' '}
                <span className="font-semibold">"{submitted!.petName}"</span>
                {submitted!.breed && (
                  <> · <span className="font-semibold">"{submitted!.breed}"</span></>
                )}
              </p>
              <p className="text-[11px] text-muted">
                Register a new owner and pet to continue.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={() => onNotFound(submitted!.petName, submitted!.breed, submitted!.species, submitted!.ownerPhone)}
            className="rounded-[4px] border border-primary px-4 py-[9px] text-[13px] font-semibold text-primary hover:opacity-85 transition-opacity"
          >
            Register new patient
          </button>
        </div>
      )}
    </div>
  )
}

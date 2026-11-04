import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PawPrint, Phone, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinic } from '@/features/clinic'
import { PetSearchStep } from '@/features/checkin/components/pet-search-step'
import { usePetSearch } from '@/features/checkin/services/use-pet-search'
import type { Pet, PetOwner } from '@/features/checkin/types'

type Mode = 'pet' | 'owner'

export function PetSearchPage() {
  const { clinicId } = useClinic()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('pet')

  if (!clinicId) {
    return <p className="px-6 py-8 text-[12px] text-muted">Loading clinic…</p>
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Pet Search
        </h1>
      </header>

      <main className="mx-auto max-w-xl w-full px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 rounded-[4px] border border-border-base overflow-hidden">
          <ModeButton
            label="Search by pet"
            active={mode === 'pet'}
            onClick={() => setMode('pet')}
            first
          />
          <ModeButton
            label="Search by owner"
            active={mode === 'owner'}
            onClick={() => setMode('owner')}
          />
        </div>

        {mode === 'pet' ? (
          <PetSearchStep
            clinicId={clinicId}
            variant="records"
            onFound={({ pet }) => navigate(`/reception/pets/${pet.id}`)}
          />
        ) : (
          <OwnerSearch
            clinicId={clinicId}
            onSelectPet={(pet) => navigate(`/reception/pets/${pet.id}`)}
          />
        )}
      </main>
    </div>
  )
}

function ModeButton({
  label,
  active,
  onClick,
  first,
}: {
  label: string
  active: boolean
  onClick: () => void
  first?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'py-[9px] text-[13px] font-semibold transition-colors',
        first && 'border-r border-border-base',
        active ? 'bg-primary text-white' : 'bg-surface text-muted hover:bg-surface-2 hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

function OwnerSearch({
  clinicId,
  onSelectPet,
}: {
  clinicId: string
  onSelectPet: (pet: Pet) => void
}) {
  const [phoneDigits, setPhoneDigits] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [submittedPhone, setSubmittedPhone] = useState('')

  const phoneComplete = phoneDigits.length === 10
  const ownerPhone = phoneComplete ? '+91' + phoneDigits : ''

  const { data: results, isLoading, isFetched } = usePetSearch(
    clinicId,
    '',
    '',
    'dog',
    !!submittedPhone,
    submittedPhone || undefined,
  )

  const nameNeedle = ownerName.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!results) return []
    if (!nameNeedle) return results
    return results.filter((r) => r.owner.name.toLowerCase().includes(nameNeedle))
  }, [results, nameNeedle])

  const ownerGroups = useMemo(() => {
    const map = new Map<string, { owner: PetOwner; pets: Pet[] }>()
    for (const { pet, owner } of filtered) {
      const group = map.get(owner.id)
      if (group) group.pets.push(pet)
      else map.set(owner.id, { owner, pets: [pet] })
    }
    return [...map.values()]
  }, [filtered])

  function handleSearch() {
    if (!phoneComplete) return
    setSubmittedPhone(ownerPhone)
  }

  const noResults = isFetched && !!submittedPhone && ownerGroups.length === 0

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted flex items-center gap-1.5">
          <Phone size={10} />
          Owner Phone
        </p>
        <div
          className={cn(
            'flex items-center rounded-[4px] border overflow-hidden transition-colors',
            phoneDigits.length > 0 && !phoneComplete ? 'border-danger' : 'border-border-base',
          )}
        >
          <span className="flex-shrink-0 select-none border-r border-border-base bg-surface-2 px-3 py-[9px] text-[13px] font-semibold text-muted">
            +91
          </span>
          <input
            type="tel"
            placeholder="98765 43210"
            value={phoneDigits}
            onChange={(e) => {
              setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))
              setSubmittedPhone('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
            inputMode="numeric"
            autoFocus
            className="flex-1 bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>
        {phoneDigits.length > 0 && !phoneComplete && (
          <p className="text-[11px] text-danger">Enter the full 10-digit number</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Owner name{' '}
          <span className="text-muted font-normal normal-case">(optional)</span>
        </p>
        <input
          type="text"
          placeholder="e.g. Priya"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch()
          }}
          className="w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
        />
      </div>

      <button
        type="button"
        onClick={handleSearch}
        disabled={!phoneComplete || isLoading}
        className={cn(
          'flex w-full items-center justify-center gap-1.5 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white transition-opacity',
          !phoneComplete || isLoading ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-85',
        )}
      >
        <Search size={14} />
        {isLoading ? 'Searching…' : 'Search'}
      </button>

      {ownerGroups.length > 0 && (
        <div className="space-y-4">
          {ownerGroups.map(({ owner, pets }) => (
            <div key={owner.id} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <User size={11} className="text-muted flex-shrink-0" />
                <span className="text-[12px] font-semibold text-foreground">{owner.name}</span>
                <span className="text-[12px] text-muted">· {owner.phone}</span>
              </div>
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => onSelectPet(pet)}
                  className="w-full rounded-[4px] border border-border-base bg-surface p-4 text-left hover:border-primary hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-primary/10 flex-shrink-0">
                      <PawPrint size={13} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{pet.name}</p>
                      <p className="text-[11px] text-muted capitalize">
                        {pet.species}
                        {pet.breed ? ` · ${pet.breed}` : ''}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {noResults && (
        <div className="rounded-[4px] border border-border-base bg-surface p-4">
          <p className="text-[13px] font-medium text-foreground">No pets found</p>
          <p className="mt-1 text-[11px] text-muted">
            Check the phone number{nameNeedle ? ' or owner name' : ''}. This section only
            shows pets already on file.
          </p>
        </div>
      )}
    </div>
  )
}

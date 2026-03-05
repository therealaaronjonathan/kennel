import { useState } from 'react'
import { Search, User, PawPrint } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOwnerSearch } from '../services/use-owner-search'
import type { PetOwner, Pet } from '../types'

interface OwnerSearchStepProps {
  clinicId: string
  branchId: string
  onFound: (owner: PetOwner, pets: Pet[]) => void
  onNotFound: (searchTerm: string) => void
}

export function OwnerSearchStep({
  clinicId,
  branchId,
  onFound,
  onNotFound,
}: OwnerSearchStepProps) {
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState('')

  const { data, isLoading, isFetched } = useOwnerSearch(
    clinicId,
    branchId,
    submitted,
    !!submitted,
  )

  function handleSearch() {
    if (!input.trim()) return
    setSubmitted(input.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  const notFound = isFetched && submitted && data === null

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted mb-1.5">
          Search Owner
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Phone number or email address"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={!input.trim() || isLoading}
            className={cn(
              'flex items-center gap-1.5 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white transition-opacity',
              (!input.trim() || isLoading) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-85',
            )}
          >
            <Search size={14} />
            {isLoading ? 'Searching…' : 'Search'}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          Enter a phone number or email to look up an existing owner
        </p>
      </div>

      {/* Result: found */}
      {data && (
        <div className="rounded-[4px] border border-border-active bg-surface-2 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-primary/10">
              <User size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                {data.owner.name}
              </p>
              <p className="text-[11px] text-muted">
                {data.owner.phone}
                {data.owner.email && ` · ${data.owner.email}`}
              </p>
            </div>
          </div>

          {data.pets.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                Pets
              </p>
              {data.pets.map((pet) => (
                <div
                  key={pet.id}
                  className="flex items-center gap-2 rounded-[4px] bg-white px-3 py-2"
                >
                  <PawPrint size={13} className="text-muted flex-shrink-0" />
                  <span className="text-[13px] font-medium text-foreground">
                    {pet.name}
                  </span>
                  <span className="text-[11px] text-muted capitalize">
                    {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => onFound(data.owner, data.pets)}
            className="w-full rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity"
          >
            Continue with {data.owner.name}
          </button>
        </div>
      )}

      {/* Result: not found */}
      {notFound && (
        <div className="rounded-[4px] border border-border-base bg-surface p-4 space-y-3">
          <p className="text-[13px] font-medium text-foreground">
            No owner found for{' '}
            <span className="font-semibold">"{submitted}"</span>
          </p>
          <p className="text-[11px] text-muted">
            Register a new owner and pet to continue.
          </p>
          <button
            type="button"
            onClick={() => onNotFound(submitted)}
            className="rounded-[4px] border border-primary px-4 py-[9px] text-[13px] font-semibold text-primary hover:opacity-85 transition-opacity"
          >
            Register new owner
          </button>
        </div>
      )}
    </div>
  )
}

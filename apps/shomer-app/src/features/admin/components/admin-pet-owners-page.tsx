import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Search, ChevronRight, ChevronDown, Pencil, User, PawPrint } from 'lucide-react'
import { EditOwnerDialog } from '@/components/blocks/edit-owner-dialog'
import { EditPetDialog } from '@/components/blocks/edit-pet-dialog'
import { useAdminPetOwners, fetchPetsByOwner } from '../services/use-admin-pet-owners'
import type { Pet, PetOwner } from '@/features/checkin/types'

function speciesLabel(pet: Pet): string {
  if (pet.species === 'other' && pet.speciesName) return pet.speciesName
  return pet.species.charAt(0).toUpperCase() + pet.species.slice(1)
}

export function AdminPetOwnersPage() {
  const { id: clinicId } = useParams<{ id: string }>()
  const { owners, loading, loadingMore, hasMore, error, setPhone, loadMore, patchOwner } =
    useAdminPetOwners(clinicId)

  const [term, setTerm] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [petsByOwner, setPetsByOwner] = useState<Record<string, Pet[]>>({})
  const [petsLoading, setPetsLoading] = useState<Set<string>>(new Set())
  const [editOwner, setEditOwner] = useState<PetOwner | null>(null)
  const [editPet, setEditPet] = useState<{ pet: Pet; owner: PetOwner } | null>(null)

  // Phone search is server-side (digits); a name term filters loaded rows only.
  const nameMode = /[a-zA-Z]/.test(term)
  useEffect(() => {
    const t = setTimeout(() => {
      setPhone(nameMode ? '' : term.replace(/\D/g, ''))
    }, 300)
    return () => clearTimeout(t)
  }, [term, nameMode, setPhone])

  const displayed = nameMode
    ? owners.filter((o) => o.name.toLowerCase().includes(term.toLowerCase()))
    : owners

  async function toggleExpand(owner: PetOwner) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(owner.id)) next.delete(owner.id)
      else next.add(owner.id)
      return next
    })
    if (petsByOwner[owner.id] || !clinicId) return
    setPetsLoading((prev) => new Set(prev).add(owner.id))
    try {
      const pets = await fetchPetsByOwner(clinicId, owner.id)
      setPetsByOwner((prev) => ({ ...prev, [owner.id]: pets }))
    } finally {
      setPetsLoading((prev) => {
        const next = new Set(prev)
        next.delete(owner.id)
        return next
      })
    }
  }

  if (!clinicId) return null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">Pet Owners</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 max-w-3xl">
          <p className="text-[13px] text-muted mb-5">
            Browse owners and their pets. Search by phone; type a name to filter the loaded list.
          </p>

      {/* Search */}
      <div className="mb-5 flex items-center rounded-[4px] border border-border-base bg-background overflow-hidden">
        <Search size={15} className="ml-3 text-muted flex-shrink-0" />
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by phone, or filter loaded by name…"
          className="flex-1 bg-transparent px-3 py-[10px] text-[14px] text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>

      {error && <p className="text-[13px] text-danger mb-4">{error}</p>}

      {loading ? (
        <p className="text-[13px] text-muted">Loading…</p>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[28px]">🐾</p>
          <p className="text-[13px] font-semibold text-muted mt-2">
            {term ? 'No owners match your search' : 'No pet owners yet'}
          </p>
        </div>
      ) : (
        <div className="rounded-[4px] border border-border-base divide-y divide-border-base">
          {displayed.map((owner) => {
            const isOpen = expanded.has(owner.id)
            const pets = petsByOwner[owner.id]
            const isPetsLoading = petsLoading.has(owner.id)
            return (
              <div key={owner.id}>
                {/* Owner row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(owner)}
                    className="flex flex-1 items-center gap-2 text-left min-w-0"
                  >
                    {isOpen ? (
                      <ChevronDown size={15} className="text-muted flex-shrink-0" />
                    ) : (
                      <ChevronRight size={15} className="text-muted flex-shrink-0" />
                    )}
                    <User size={13} className="text-muted flex-shrink-0" />
                    <span className="text-[14px] font-semibold text-foreground truncate">{owner.name}</span>
                    <span className="text-[12px] text-muted truncate">· {owner.phone}</span>
                    {pets && (
                      <span className="text-[11px] text-muted flex-shrink-0">
                        · {pets.length} pet{pets.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditOwner(owner)}
                    title="Edit owner details"
                    className="flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-primary transition-colors flex-shrink-0"
                  >
                    <Pencil size={11} />
                    Edit
                  </button>
                </div>

                {/* Pets */}
                {isOpen && (
                  <div className="bg-surface/50 px-4 pb-3 pl-11 space-y-1.5">
                    {isPetsLoading && !pets ? (
                      <p className="text-[12px] text-muted py-1">Loading pets…</p>
                    ) : pets && pets.length > 0 ? (
                      pets.map((pet) => (
                        <div key={pet.id} className="flex items-center gap-2 py-1">
                          <PawPrint size={12} className="text-primary flex-shrink-0" />
                          <span className="text-[13px] font-medium text-foreground">{pet.name}</span>
                          <span className="text-[11px] text-muted truncate">
                            · {speciesLabel(pet)}{pet.breed ? ` · ${pet.breed}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditPet({ pet, owner })}
                            title="Edit pet details"
                            className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-primary transition-colors flex-shrink-0"
                          >
                            <Pencil size={11} />
                            Edit
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[12px] text-muted py-1">No pets under this owner</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Load more (browse only) */}
      {!loading && hasMore && !nameMode && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

        </div>
      </div>

      {/* Dialogs */}
      {editOwner && (
        <EditOwnerDialog
          open
          clinicId={clinicId}
          owner={editOwner}
          onCancel={() => setEditOwner(null)}
          onSaved={(patch) => {
            patchOwner(editOwner.id, {
              name: patch.name,
              email: patch.email,
              altPhone: patch.altPhone,
            })
            setEditOwner(null)
          }}
        />
      )}

      {editPet && (
        <EditPetDialog
          open
          clinicId={clinicId}
          branchIds={editPet.owner.branchIds ?? []}
          pet={editPet.pet}
          onCancel={() => setEditPet(null)}
          onSaved={(updated) => {
            setPetsByOwner((prev) => ({
              ...prev,
              [editPet.owner.id]: (prev[editPet.owner.id] ?? []).map((p) =>
                p.id === updated.id ? updated : p,
              ),
            }))
            setEditPet(null)
          }}
        />
      )}
    </div>
  )
}

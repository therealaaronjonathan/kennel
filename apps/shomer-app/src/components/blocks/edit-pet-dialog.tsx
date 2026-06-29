import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PawPrint } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { ErrorDetails } from '@/components/primitives/error-details'
import { updatePetDetails } from '@/features/checkin/services/edit-names'
import type { Pet } from '@/features/checkin/types'

interface EditPetDialogProps {
  open: boolean
  clinicId: string
  branchIds: string[] // owner's branchIds — scope for the petName cascade
  pet: Pet
  onCancel: () => void
  onSaved: (updated: Pet) => void
}

const SPECIES_OPTIONS: { value: Pet['species']; label: string }[] = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
  { value: 'bird', label: 'Bird' },
  { value: 'rabbit', label: 'Rabbit' },
  { value: 'other', label: 'Other' },
]

export function EditPetDialog({ open, clinicId, branchIds, pet, onCancel, onSaved }: EditPetDialogProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(pet.name)
  const [species, setSpecies] = useState<Pet['species']>(pet.species)
  const [speciesName, setSpeciesName] = useState(pet.speciesName ?? '')
  const [breed, setBreed] = useState(pet.breed ?? '')
  const [gender, setGender] = useState<'male' | 'female' | ''>(pet.gender ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(pet.dateOfBirth ?? '')
  const [color, setColor] = useState(pet.color ?? '')
  const [microchipNumber, setMicrochipNumber] = useState(pet.microchipNumber ?? '')

  useEffect(() => {
    if (!open) return
    setName(pet.name)
    setSpecies(pet.species)
    setSpeciesName(pet.speciesName ?? '')
    setBreed(pet.breed ?? '')
    setGender(pet.gender ?? '')
    setDateOfBirth(pet.dateOfBirth ?? '')
    setColor(pet.color ?? '')
    setMicrochipNumber(pet.microchipNumber ?? '')
  }, [open, pet])

  const nameTrim = name.trim()
  const speciesNameValid = species !== 'other' || speciesName.trim().length > 0
  const microchipValid = microchipNumber.length <= 15
  const valid = nameTrim.length > 0 && speciesNameValid && microchipValid

  const mutation = useMutation({
    mutationFn: () =>
      updatePetDetails(clinicId, branchIds, pet.id, pet.name, {
        name: nameTrim,
        species,
        speciesName,
        breed,
        gender,
        dateOfBirth,
        color,
        microchipNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petSearch'] })
      onSaved({
        ...pet,
        name: nameTrim,
        petNameLower: nameTrim.toLowerCase(),
        species,
        speciesName: species === 'other' ? speciesName.trim() || undefined : undefined,
        breed: breed.trim() || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        color: color.trim() || undefined,
        microchipNumber: microchipNumber.trim() || undefined,
      })
    },
  })

  const loading = mutation.isPending

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  const canSave = valid && !loading
  const inputClass =
    'w-full rounded-[4px] border border-border-base bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-50'
  const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (canSave) mutation.mutate()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto"
      onClick={() => !loading && onCancel()}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[4px] bg-surface border border-border-base shadow-lg my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border-base px-5 py-4">
          <PawPrint size={14} className="text-muted flex-shrink-0" />
          <span className="text-[14px] font-bold text-foreground">Edit pet details</span>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className={labelClass}>Pet name</label>
            <input type="text" autoFocus value={name} disabled={loading} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>

          {/* Species */}
          <div className="space-y-1.5">
            <label className={labelClass}>Species</label>
            <select
              value={species}
              disabled={loading}
              onChange={(e) => setSpecies(e.target.value as Pet['species'])}
              className={inputClass}
            >
              {SPECIES_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {species === 'other' && (
            <div className="space-y-1.5">
              <label className={labelClass}>Species name</label>
              <input type="text" value={speciesName} disabled={loading} placeholder="e.g. Hamster, Parrot…" onChange={(e) => setSpeciesName(e.target.value)} className={inputClass} />
              {!speciesNameValid && <p className="text-[11px] text-danger">Required</p>}
            </div>
          )}

          {/* Gender */}
          <div className="space-y-1.5">
            <label className={labelClass}>Gender</label>
            <div className="grid grid-cols-2 rounded-[4px] border border-border-base overflow-hidden">
              {(['male', 'female'] as const).map((g, i) => (
                <button
                  key={g}
                  type="button"
                  disabled={loading}
                  onClick={() => setGender((prev) => (prev === g ? '' : g))}
                  className={cn(
                    'py-2 text-[13px] font-semibold capitalize transition-colors',
                    i === 0 && 'border-r border-border-base',
                    gender === g ? 'bg-primary text-white' : 'bg-surface text-muted hover:bg-surface-2 hover:text-foreground',
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Breed + DOB */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Breed</label>
              <input type="text" value={breed} disabled={loading} onChange={(e) => setBreed(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Date of Birth</label>
              <input type="date" max={new Date().toISOString().split('T')[0]} value={dateOfBirth} disabled={loading} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className={labelClass}>Color / Markings</label>
            <input type="text" value={color} disabled={loading} onChange={(e) => setColor(e.target.value)} className={inputClass} />
          </div>

          {/* Microchip */}
          <div className="space-y-1.5">
            <label className={labelClass}>Microchip No.</label>
            <input type="text" value={microchipNumber} disabled={loading} maxLength={15} onChange={(e) => setMicrochipNumber(e.target.value)} className={inputClass} />
            {!microchipValid && <p className="text-[11px] text-danger">Maximum 15 characters</p>}
          </div>

          {mutation.isError && (
            <ErrorDetails message={(mutation.error as Error)?.message ?? 'Could not save. Try again.'} className="mt-1" />
          )}
        </div>

        <div className="flex gap-2 border-t border-border-base px-5 py-4">
          <button type="button" onClick={onCancel} disabled={loading} className="flex-1 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={!canSave} className="flex-1 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

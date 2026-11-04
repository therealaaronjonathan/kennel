import { getAgeFromDob } from '@/lib/age'
import type { Pet, PetOwner } from '@/features/checkin/types'

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'

const SPECIES_LABEL: Record<string, string> = {
  dog: 'Dog',
  cat: 'Cat',
  bird: 'Bird',
  rabbit: 'Rabbit',
  other: 'Other',
}

function dash(value: string | undefined | null): string {
  const v = value?.trim()
  return v ? v : '—'
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className={labelClass}>{label}</span>
      <span className="text-[13px] font-semibold text-foreground text-right">{value}</span>
    </div>
  )
}

export function PetInformationTab({ pet, owner }: { pet: Pet; owner: PetOwner }) {
  const species =
    pet.species === 'other' && pet.speciesName
      ? pet.speciesName
      : (SPECIES_LABEL[pet.species] ?? pet.species)
  const gender =
    pet.gender === 'male' ? 'Male' : pet.gender === 'female' ? 'Female' : '—'
  const age = getAgeFromDob(pet.dateOfBirth)

  return (
    <div className="space-y-4">
      <section className="rounded-[4px] border border-border-base bg-surface px-4 divide-y divide-border-base">
        <Row label="Pet" value={dash(pet.name)} />
        <Row label="Species" value={dash(species)} />
        <Row label="Breed" value={dash(pet.breed)} />
        <Row label="Gender" value={gender} />
        <Row label="Age" value={age ? `${age} old` : '—'} />
        <Row label="Colour" value={dash(pet.color)} />
        <Row label="Microchip" value={dash(pet.microchipNumber)} />
      </section>

      <section className="rounded-[4px] border border-border-base bg-surface px-4 divide-y divide-border-base">
        <Row label="Owner" value={dash(owner.name)} />
        <Row label="Phone" value={dash(owner.phone)} />
        <Row label="Alt phone" value={dash(owner.altPhone)} />
        <Row label="Email" value={dash(owner.email)} />
      </section>
    </div>
  )
}

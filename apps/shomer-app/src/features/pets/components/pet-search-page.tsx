import { useNavigate } from 'react-router-dom'
import { useClinic } from '@/features/clinic'
import { PetSearchStep } from '@/features/checkin/components/pet-search-step'

export function PetSearchPage() {
  const { clinicId } = useClinic()
  const navigate = useNavigate()

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
        <p className="text-[13px] text-muted leading-relaxed">
          Search for a pet by entering the owner’s phone number, or the pet name and breed.
        </p>
        <PetSearchStep
          clinicId={clinicId}
          variant="records"
          onFound={({ pet }) => navigate(`/reception/pets/${pet.id}`)}
        />
      </main>
    </div>
  )
}

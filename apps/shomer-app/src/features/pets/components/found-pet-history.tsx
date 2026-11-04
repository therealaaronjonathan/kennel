import { useState } from 'react'
import { usePetVisitHistory, type PetHistoryVisit } from '../services/use-pet-visit-history'
import { LastVisitCard } from './last-visit-card'
import { PetVisitKpis } from './pet-visit-kpis'
import { PetVisitList } from './pet-visit-list'
import { PetVisitDetailOverlay } from './pet-visit-detail-overlay'

export function FoundPetHistory({
  clinicId,
  petId,
}: {
  clinicId: string
  petId: string
}) {
  const { visits, kpis, lastVisit, lastVisitBranchName, loading, error } =
    usePetVisitHistory(clinicId, petId, null)
  const [selected, setSelected] = useState<PetHistoryVisit | null>(null)

  if (loading) {
    return <p className="text-[12px] text-muted">Loading visit history…</p>
  }
  if (error) {
    return <p className="text-[12px] text-danger">{error}</p>
  }

  return (
    <div className="space-y-3">
      <PetVisitKpis kpis={kpis} />
      {lastVisit && (
        <LastVisitCard visit={lastVisit} branchName={lastVisitBranchName} />
      )}
      <PetVisitList
        visits={visits}
        selectedId={selected?.id}
        onSelect={setSelected}
      />
      {selected && (
        <PetVisitDetailOverlay
          visit={selected}
          clinicId={clinicId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

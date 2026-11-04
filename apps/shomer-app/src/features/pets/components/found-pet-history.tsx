import { usePetVisitHistory } from '../services/use-pet-visit-history'
import { LastVisitCard } from './last-visit-card'
import { PetVisitKpis } from './pet-visit-kpis'
import { PetVisitList } from './pet-visit-list'

export function FoundPetHistory({
  clinicId,
  petId,
}: {
  clinicId: string
  petId: string
}) {
  const { visits, kpis, lastVisit, lastVisitBranchName, loading, error } =
    usePetVisitHistory(clinicId, petId, null)

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
        <LastVisitCard visit={lastVisit} branchName={lastVisitBranchName} clinicId={clinicId} />
      )}
      <PetVisitList visits={visits} expandable clinicId={clinicId} />
    </div>
  )
}

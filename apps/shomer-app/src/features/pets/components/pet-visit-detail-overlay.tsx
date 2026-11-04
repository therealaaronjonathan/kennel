import { VisitDetailDrawer } from '@/components/blocks/visit-detail-drawer'
import { VisitDetailPanel } from '@/features/dashboard/components/visit-detail-panel'
import { toCompletedVisit } from '../services/to-completed-visit'
import type { PetHistoryVisit } from '../services/use-pet-visit-history'

interface PetVisitDetailOverlayProps {
  visit: PetHistoryVisit
  clinicId: string
  onClose: () => void
}

export function PetVisitDetailOverlay({
  visit,
  clinicId,
  onClose,
}: PetVisitDetailOverlayProps) {
  return (
    <VisitDetailDrawer open onClose={onClose}>
      <VisitDetailPanel
        visit={toCompletedVisit(visit)}
        clinicId={clinicId}
        branchId={visit.branchId}
        onToast={() => {}}
        canEditNames={false}
      />
    </VisitDetailDrawer>
  )
}

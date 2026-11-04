import { X } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/20"
        aria-label="Close visit"
        onClick={onClose}
      />
      <div className="relative h-full w-full max-w-md bg-background border-l border-border-base shadow-lg flex flex-col">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-[4px] text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <X size={14} />
        </button>
        <VisitDetailPanel
          visit={toCompletedVisit(visit)}
          clinicId={clinicId}
          branchId={visit.branchId}
          onToast={() => {}}
          canEditNames={false}
        />
      </div>
    </div>
  )
}

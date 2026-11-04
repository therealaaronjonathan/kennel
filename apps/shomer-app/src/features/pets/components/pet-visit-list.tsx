import { cn, formatInr } from '@/lib/utils'
import type { PetHistoryVisit } from '../services/use-pet-visit-history'

function formatListDate(yyyymmdd: string): string {
  if (!yyyymmdd) return '—'
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return yyyymmdd
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function paymentState(visit: PetHistoryVisit): { label: string; className: string } {
  const paid = visit.amountPaid ?? 0
  const total = visit.billAmount ?? 0
  if (total > 0 && paid >= total) {
    return { label: 'Paid', className: 'text-success' }
  }
  if (paid > 0 && paid < total) {
    return { label: 'Partial', className: 'text-warning' }
  }
  if (total > 0) {
    return { label: 'Unpaid', className: 'text-warning' }
  }
  return { label: '—', className: 'text-muted' }
}

interface PetVisitListProps {
  visits: PetHistoryVisit[]
  selectedId?: string | null
  onSelect: (visit: PetHistoryVisit) => void
  emptyLabel?: string
}

export function PetVisitList({
  visits,
  selectedId,
  onSelect,
  emptyLabel = 'No visits yet',
}: PetVisitListProps) {
  if (visits.length === 0) {
    return (
      <div className="rounded-[4px] border border-border-base bg-surface px-4 py-8 text-center">
        <p className="text-[13px] font-semibold text-muted">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
      {visits.map((visit) => {
        const pay = paymentState(visit)
        const summary =
          visit.complaints[0] ||
          visit.service ||
          visit.tokenDisplay ||
          'Visit'
        const isSelected = selectedId === visit.id

        return (
          <button
            key={visit.id}
            type="button"
            onClick={() => onSelect(visit)}
            className={cn(
              'w-full text-left px-4 py-3 transition-colors',
              isSelected ? 'bg-surface-2 border-l-2 border-l-primary' : 'bg-surface hover:bg-surface-2/60',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">
                  {formatListDate(visit.date)}
                  {visit.tokenDisplay ? ` · ${visit.tokenDisplay}` : ''}
                </p>
                <p className="mt-0.5 text-[12px] text-muted truncate">
                  {visit.branchName}
                  {visit.doctorName ? ` · ${visit.doctorName}` : ''}
                </p>
                <p className="mt-0.5 text-[12px] text-muted truncate">{summary}</p>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span className={cn('text-[11px] font-semibold', pay.className)}>{pay.label}</span>
                <span className="text-[12px] font-semibold tabular-nums text-foreground">
                  {(visit.amountPaid ?? 0) > 0 ? formatInr(visit.amountPaid ?? 0) : '—'}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatInr } from '@/lib/utils'
import type { LastVisitSummary } from '@/features/vet/services/use-visit-detail'
import {
  loadLastVisitSummary,
  type PetHistoryVisit,
} from '../services/use-pet-visit-history'
import { visitPaymentState } from '../services/visit-payment-state'
import { LastVisitDetails } from './last-visit-card'

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

interface PetVisitListProps {
  visits: PetHistoryVisit[]
  selectedId?: string | null
  onSelect?: (visit: PetHistoryVisit) => void
  emptyLabel?: string
  expandable?: boolean
  clinicId?: string
}

export function PetVisitList({
  visits,
  selectedId,
  onSelect,
  emptyLabel = 'No visits yet',
  expandable = false,
  clinicId,
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
      {visits.map((visit) =>
        expandable && clinicId ? (
          <ExpandableVisitRow key={visit.id} visit={visit} clinicId={clinicId} />
        ) : (
          <VisitRow
            key={visit.id}
            visit={visit}
            selected={selectedId === visit.id}
            onSelect={() => onSelect?.(visit)}
          />
        ),
      )}
    </div>
  )
}

function VisitRowHeader({ visit }: { visit: PetHistoryVisit }) {
  const pay = visitPaymentState(visit.amountPaid, visit.billAmount)
  const summary =
    visit.complaints[0] || visit.service || visit.tokenDisplay || 'Visit'

  return (
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
  )
}

function VisitRow({
  visit,
  selected,
  onSelect,
}: {
  visit: PetHistoryVisit
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-4 py-3 transition-colors',
        selected ? 'bg-surface-2 border-l-2 border-l-primary' : 'bg-surface hover:bg-surface-2/60',
      )}
    >
      <VisitRowHeader visit={visit} />
    </button>
  )
}

function ExpandableVisitRow({
  visit,
  clinicId,
}: {
  visit: PetHistoryVisit
  clinicId: string
}) {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState<LastVisitSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || summary) return
    let cancelled = false
    setLoading(true)
    setError(null)
    loadLastVisitSummary(clinicId, visit)
      .then((s) => {
        if (!cancelled) setSummary(s)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load visit.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, clinicId, visit, summary])

  return (
    <div className={cn('bg-surface', open && 'bg-surface-2')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'w-full text-left px-4 py-3 transition-colors hover:bg-surface-2/60',
          open && 'border-b border-border-base',
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <VisitRowHeader visit={visit} />
          </div>
          {open ? (
            <ChevronUp size={14} className="text-muted mt-1 flex-shrink-0" />
          ) : (
            <ChevronDown size={14} className="text-muted mt-1 flex-shrink-0" />
          )}
        </div>
      </button>
      {open && loading && (
        <p className="px-4 py-3 text-[12px] text-muted">Loading visit…</p>
      )}
      {open && error && <p className="px-4 py-3 text-[12px] text-danger">{error}</p>}
      {open && summary && (
        <LastVisitDetails
          visit={summary}
          clinicId={clinicId}
          emptyLabel="No notes recorded for this visit."
        />
      )}
    </div>
  )
}

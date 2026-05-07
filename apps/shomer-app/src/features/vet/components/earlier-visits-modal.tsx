import { useEffect } from 'react'
import { ExternalLink, AlertTriangle } from 'lucide-react'
import { cn, formatInr } from '@/lib/utils'
import {
  PAYMENT_METHOD_LABELS,
} from '@/features/checkout/services/complete-billing'
import type { EarlierVisitSummary } from '../services/use-visit-detail'

function formatDateLong(yyyymmdd: string): string {
  if (!yyyymmdd) return ''
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return yyyymmdd
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface EarlierVisitsModalProps {
  open: boolean
  visits: EarlierVisitSummary[]
  clinicId: string
  branchId: string
  onClose: () => void
}

export function EarlierVisitsModal({
  open,
  visits,
  clinicId,
  branchId,
  onClose,
}: EarlierVisitsModalProps) {
  // Escape to close
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function openSummary(visitId: string) {
    const baseUrl = import.meta.env.VITE_APP_BASE_URL ?? 'https://shomer-app-test.web.app'
    const url = `${baseUrl}/visit/${visitId}/summary?clinicId=${clinicId}&branchId=${branchId}`
    window.open(url, '_blank')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-[4px] bg-surface border border-border-base shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-base px-5 py-4 flex-shrink-0">
          <div>
            <p className="text-[14px] font-bold text-foreground">Earlier visits</p>
            <p className="mt-0.5 text-[11px] text-muted">
              {visits.length} earlier visit{visits.length !== 1 ? 's' : ''} on file
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] font-semibold text-muted hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border-base">
          {visits.map((v) => {
            const topComplaint = v.complaints[0]
            return (
              <button
                key={v.visitId}
                type="button"
                onClick={() => openSummary(v.visitId)}
                className="w-full text-left px-5 py-3.5 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-foreground">
                        {formatDateLong(v.date)}
                      </span>
                      {v.isEmergency && (
                        <span className="flex items-center gap-1 rounded-[3px] bg-danger/10 border border-danger/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-danger">
                          <AlertTriangle size={9} />
                          ER
                        </span>
                      )}
                      {v.service && (
                        <span className="rounded-[3px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-primary">
                          {v.service}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12px] text-muted truncate">
                      {v.doctorName ?? 'Doctor not recorded'}
                      {topComplaint ? ` · ${topComplaint}` : ''}
                      {v.complaints.length > 1 ? ` +${v.complaints.length - 1}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {typeof v.billAmount === 'number' && v.billAmount > 0 && (
                      <span className="text-[12px] font-bold text-foreground tabular-nums">
                        {formatInr(v.billAmount)}
                      </span>
                    )}
                    {v.payments && v.payments.length > 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                        {v.payments.length > 1
                          ? 'Split'
                          : PAYMENT_METHOD_LABELS[v.payments[0].method]}
                      </span>
                    )}
                    <ExternalLink size={11} className={cn('text-muted', 'mt-0.5')} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

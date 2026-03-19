import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinic } from '@/features/clinic'
import { useAllVisits, type AllVisit } from '../services/use-all-visits'
import { VisitDetailPanel } from '@/features/dashboard/components/visit-detail-panel'
import type { CompletedVisit } from '@/features/dashboard/services/use-completed-visits'

const STATUS_CONFIG: Record<string, { dot: string; label: string; text: string }> = {
  waiting:       { dot: 'bg-muted opacity-50',  label: 'Waiting',     text: 'text-muted' },
  'in-progress': { dot: 'bg-warning',           label: 'In Progress', text: 'text-warning' },
  completed:     { dot: 'bg-success',           label: 'Completed',  text: 'text-success' },
  billed:        { dot: 'bg-success opacity-40', label: 'Billed',     text: 'text-muted' },
  cancelled:     { dot: 'bg-danger opacity-40', label: 'Cancelled',  text: 'text-muted' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      <span className={cn('text-[11px] font-semibold', cfg.text)}>{cfg.label}</span>
    </div>
  )
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-[4px] bg-foreground px-4 py-3">
      <CheckCircle size={14} className="text-success flex-shrink-0" />
      <span className="text-[13px] font-semibold text-background whitespace-nowrap">{message}</span>
    </div>
  )
}

// Adapt AllVisit → CompletedVisit for VisitDetailPanel
function toCompletedVisit(v: AllVisit): CompletedVisit {
  return {
    id: v.id,
    tokenDisplay: v.tokenDisplay,
    petName: v.petName,
    ownerName: v.ownerName,
    ownerId: v.ownerId,
    petId: '',
    doctorName: v.doctorName,
    doctorId: v.doctorId,
    complaints: v.complaints,
    completedAt: null,
    date: '',
  }
}

export function ReceptionQueuePage() {
  const { clinicId, branchId } = useClinic()
  const { visits, loading, error } = useAllVisits(clinicId, branchId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const selectedVisit = visits.find((v) => v.id === selectedId) ?? null
  const hasPanel = !!selectedVisit

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Queue
        </h1>
        {!loading && (
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold text-muted">
            {visits.length} today
          </span>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: visits list */}
        <div
          className="flex flex-col overflow-hidden border-r border-border-base"
          style={{ width: hasPanel ? '55%' : '100%', transition: 'width 0.2s ease' }}
        >
          {/* Table header */}
          {!loading && visits.length > 0 && (
            <div className="grid grid-cols-[72px_1fr_1fr_1fr_100px_60px] gap-3 px-5 py-2 border-b border-border-base flex-shrink-0">
              {['Token', 'Pet', 'Owner', 'Doctor', 'Status', 'Time'].map((h) => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* Rows */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-5 py-8 text-[12px] text-muted">Loading…</p>
            ) : error ? (
              <p className="px-5 py-8 text-[12px] text-danger">{error}</p>
            ) : visits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <span className="text-[28px]">🐾</span>
                <p className="text-[13px] font-semibold text-muted">No visits today yet</p>
              </div>
            ) : (
              visits.map((visit) => {
                const isSelected = selectedId === visit.id
                const isDimmed = visit.status === 'billed' || visit.status === 'cancelled'
                const time = visit.createdAt
                  ? visit.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—'

                return (
                  <button
                    key={visit.id}
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : visit.id)}
                    className={cn(
                      'w-full grid grid-cols-[72px_1fr_1fr_1fr_100px_60px] gap-3 px-5 py-3 text-left border-b border-border-base transition-colors',
                      isSelected
                        ? 'bg-surface-2 border-l-2 border-l-primary'
                        : 'hover:bg-surface',
                      isDimmed && 'opacity-50',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[12px] font-bold truncate',
                        visit.status === 'in-progress' || isSelected ? 'text-primary' : 'text-muted',
                      )}
                    >
                      {visit.tokenDisplay}
                    </span>
                    <span className="text-[12px] font-semibold text-foreground truncate">
                      {visit.petName}
                    </span>
                    <span className="text-[12px] text-muted truncate">{visit.ownerName}</span>
                    <span className="text-[12px] text-muted truncate">{visit.doctorName}</span>
                    <StatusBadge status={visit.status} />
                    <span className="text-[11px] text-muted tabular-nums">{time}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right: detail panel */}
        {selectedVisit && clinicId && branchId && (
          <div className="flex-1 overflow-hidden flex flex-col bg-background">
            <VisitDetailPanel
              key={selectedVisit.id}
              visit={toCompletedVisit(selectedVisit)}
              clinicId={clinicId}
              branchId={branchId}
              onToast={(msg) => setToast(msg)}
            />
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

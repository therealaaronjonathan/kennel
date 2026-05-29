import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinic } from '@/features/clinic'
import { useAllVisits, type AllVisit } from '../services/use-all-visits'
import { VisitDetailPanel } from '@/features/dashboard/components/visit-detail-panel'
import type { CompletedVisit } from '@/features/dashboard/services/use-completed-visits'
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '@/features/checkout/services/complete-billing'
import { markVisitCompleted } from '../services/mark-visit-completed'

const PAYMENT_FILTER_LABELS: Record<PaymentMethod | 'split', string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  split: 'Split',
}

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

function PaymentCell({ visit }: { visit: AllVisit }) {
  const payments = visit.payments ?? []
  const paid = visit.amountPaid ?? 0
  const total = visit.billAmount ?? 0
  const isPartial = visit.status !== 'billed' && paid > 0 && paid < total

  if (isPartial) {
    return (
      <span className="text-[11px] font-semibold text-warning truncate">Partial</span>
    )
  }
  if (payments.length === 0) {
    return <span className="text-[11px] font-semibold text-muted truncate">—</span>
  }
  if (payments.length === 1) {
    return (
      <span className="text-[11px] font-semibold text-muted truncate">
        {PAYMENT_METHOD_LABELS[payments[0].method]}
      </span>
    )
  }
  return (
    <span className="rounded-[3px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-primary self-center w-fit">
      Split
    </span>
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
    otherComplaintText: v.otherComplaintText,
    consultationNotes: v.consultationNotes,
    status: v.status,
    services: v.services,
    billAmount: v.billAmount,
    payments: v.payments,
    amountPaid: v.amountPaid,
    petWeightKg: v.petWeightKg,
    petTemperatureF: v.petTemperatureF,
    completedAt: v.createdAt,
    date: v.date,
  }
}

type PaymentFilter = 'all' | PaymentMethod | 'split'

const COLS = 'grid-cols-[72px_1fr_1fr_1fr_100px_96px_60px]'

export function ReceptionQueuePage() {
  const { clinicId, branchId } = useClinic()
  const { visits, loading, error } = useAllVisits(clinicId, branchId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [doctorFilter, setDoctorFilter] = useState<string>('all')
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [completing, setCompleting] = useState(false)

  const doctors = useMemo(() => {
    const seen = new Map<string, string>()
    for (const v of visits) {
      if (v.doctorId && !seen.has(v.doctorId)) seen.set(v.doctorId, v.doctorName)
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [visits])

  const filteredVisits = useMemo(() => {
    let result = visits
    if (doctorFilter !== 'all') {
      result = result.filter((v) => v.doctorId === doctorFilter)
    }
    if (paymentFilter === 'split') {
      result = result.filter((v) => (v.payments?.length ?? 0) > 1)
    } else if (paymentFilter !== 'all') {
      result = result.filter((v) =>
        (v.payments ?? []).some((p) => p.method === paymentFilter && p.amount > 0),
      )
    }
    return result
  }, [visits, paymentFilter, doctorFilter])

  const selectedVisit = filteredVisits.find((v) => v.id === selectedId) ?? null
  const hasPanel = !!selectedVisit
  const canMarkComplete =
    !!selectedVisit &&
    (selectedVisit.status === 'waiting' || selectedVisit.status === 'in-progress')

  async function handleMarkComplete() {
    if (!clinicId || !branchId || !selectedVisit) return
    setCompleting(true)
    try {
      await markVisitCompleted(clinicId, branchId, selectedVisit.id)
      setConfirmComplete(false)
      setToast('Visit marked as complete')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-6 flex-shrink-0 gap-4">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Queue
        </h1>
        <div className="flex items-center gap-3">
          {doctors.length > 1 && (
            <label className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Doctor
              </span>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="h-8 rounded-[4px] border border-border-base bg-background px-2 text-[12px] font-semibold text-foreground focus:outline-none focus:border-primary"
              >
                <option value="all">All</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Payment
            </span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              className="h-8 rounded-[4px] border border-border-base bg-background px-2 text-[12px] font-semibold text-foreground focus:outline-none focus:border-primary"
            >
              <option value="all">All</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="split">Split</option>
            </select>
          </label>
          {!loading && (
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold text-muted">
              {filteredVisits.length}
              {doctorFilter === 'all' && paymentFilter === 'all' ? ' today' : ' filtered'}
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: visits list */}
        <div
          className="flex flex-col overflow-hidden border-r border-border-base"
          style={{ width: hasPanel ? '55%' : '100%', transition: 'width 0.2s ease' }}
        >
          {/* Table header */}
          {!loading && filteredVisits.length > 0 && (
            <div className={cn('grid gap-3 px-5 py-2 border-b border-border-base flex-shrink-0', COLS)}>
              {['Token', 'Pet', 'Owner', 'Doctor', 'Status', 'Payment', 'Time'].map((h) => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* Rows */}
          <div className="flex-1 overflow-y-auto" onClick={() => setSelectedId(null)}>
            {loading ? (
              <p className="px-5 py-8 text-[12px] text-muted">Loading…</p>
            ) : error ? (
              <p className="px-5 py-8 text-[12px] text-danger">{error}</p>
            ) : filteredVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <span className="text-[28px]">🐾</span>
                <p className="text-[13px] font-semibold text-muted">
                  {paymentFilter === 'all'
                    ? 'No visits today yet'
                    : paymentFilter === 'split'
                      ? 'No split-payment visits today'
                      : `No visits paid by ${PAYMENT_FILTER_LABELS[paymentFilter]}`}
                </p>
              </div>
            ) : (
              filteredVisits.map((visit) => {
                const isSelected = selectedId === visit.id
                const isDimmed = visit.status === 'billed' || visit.status === 'cancelled'
                const time = visit.createdAt
                  ? visit.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—'

                return (
                  <button
                    key={visit.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedId(isSelected ? null : visit.id); setConfirmComplete(false) }}
                    className={cn(
                      'w-full grid gap-3 px-5 py-3 text-left border-b border-border-base transition-colors',
                      COLS,
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
                    <PaymentCell visit={visit} />
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
            {/* Mark complete action bar */}
            {canMarkComplete && (
              <div className="flex-shrink-0 border-b border-border-base bg-surface px-4 py-2.5 flex items-center justify-between gap-3">
                <span className="text-[12px] text-muted">
                  Doctor hasn't completed this visit yet.
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmComplete(true)}
                  className="flex items-center gap-1.5 rounded-[4px] border border-success/40 bg-success/10 px-3 py-1.5 text-[12px] font-semibold text-success hover:bg-success/20 transition-colors"
                >
                  <CheckCheck size={13} />
                  Mark as Complete
                </button>
              </div>
            )}
            <VisitDetailPanel
              key={selectedVisit.id}
              visit={toCompletedVisit(selectedVisit)}
              clinicId={clinicId}
              branchId={branchId}
              canEditPaymentMethod
              onToast={(msg) => setToast(msg)}
            />
          </div>
        )}
      </div>

      {/* Mark complete confirmation modal */}
      {confirmComplete && selectedVisit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => !completing && setConfirmComplete(false)}
        >
          <div
            className="w-full max-w-sm rounded-[4px] bg-surface border border-border-base"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border-base px-5 py-4">
              <CheckCheck size={14} className="text-success flex-shrink-0" />
              <span className="text-[14px] font-bold text-foreground">Mark visit as complete?</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-muted">
                This will mark{' '}
                <span className="font-semibold text-foreground">{selectedVisit.petName}</span>'s visit as
                complete and move it to the checkout tab.
              </p>
            </div>
            <div className="flex gap-2 border-t border-border-base px-5 py-4">
              <button
                type="button"
                onClick={() => setConfirmComplete(false)}
                disabled={completing}
                className="flex-1 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkComplete}
                disabled={completing}
                className="flex-1 rounded-[4px] bg-success px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completing ? 'Completing…' : 'Yes, mark complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

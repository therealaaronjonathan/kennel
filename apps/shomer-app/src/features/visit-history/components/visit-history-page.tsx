import { useEffect, useMemo, useState } from 'react'
import { cn, formatInr } from '@/lib/utils'
import { useClinic } from '@/features/clinic'
import { useClinicServices } from '@/features/vet/services/use-clinic-services'
import { VisitDetailPanel } from '@/features/dashboard/components/visit-detail-panel'
import type { CompletedVisit } from '@/features/dashboard/services/use-completed-visits'
import {
  PAYMENT_METHOD_LABELS,
} from '@/features/checkout/services/complete-billing'
import {
  useVisitHistory,
  HISTORY_RESULT_CAP,
  type HistoryVisit,
} from '../services/use-visit-history'
import {
  HistoryFilters,
  type PaymentFilter,
} from './history-filters'
import { HistorySummary } from './history-summary'

const COLS = 'grid-cols-[72px_1fr_1fr_1fr_100px_96px_88px_72px]'

const STATUS_CONFIG: Record<string, { dot: string; label: string; text: string }> = {
  waiting:       { dot: 'bg-muted opacity-50',   label: 'Waiting',     text: 'text-muted' },
  'in-progress': { dot: 'bg-warning',            label: 'In Progress', text: 'text-warning' },
  completed:     { dot: 'bg-success',            label: 'Completed',   text: 'text-success' },
  billed:        { dot: 'bg-success opacity-40', label: 'Billed',      text: 'text-muted' },
  cancelled:     { dot: 'bg-danger opacity-40',  label: 'Cancelled',   text: 'text-muted' },
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

function PaymentCell({ visit }: { visit: HistoryVisit }) {
  const payments = visit.payments ?? []
  const paid = visit.amountPaid ?? 0
  const total = visit.billAmount ?? 0
  const isPartial = visit.status !== 'billed' && paid > 0 && paid < total

  if (isPartial) {
    return <span className="text-[11px] font-semibold text-warning truncate">Partial</span>
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

function AmountCell({ visit }: { visit: HistoryVisit }) {
  const paid = visit.amountPaid ?? 0
  if (paid <= 0) {
    return <span className="text-[11px] text-muted text-right">—</span>
  }
  const isPartial =
    visit.status !== 'billed' && paid < (visit.billAmount ?? 0)
  return (
    <span
      className={cn(
        'text-[12px] font-semibold tabular-nums truncate text-right',
        isPartial ? 'text-warning' : 'text-foreground',
      )}
    >
      {formatInr(paid)}
    </span>
  )
}

function toCompletedVisit(v: HistoryVisit): CompletedVisit {
  return {
    id: v.id,
    tokenDisplay: v.tokenDisplay,
    petName: v.petName,
    ownerName: v.ownerName,
    ownerId: v.ownerId,
    petId: v.petId,
    doctorName: v.doctorName,
    doctorId: v.doctorId,
    complaints: v.complaints,
    otherComplaintText: v.otherComplaintText,
    consultationNotes: v.consultationNotes,
    isEmergency: v.isEmergency,
    status: v.status,
    services: v.services,
    billAmount: v.billAmount,
    payments: v.payments,
    amountPaid: v.amountPaid,
    completedAt: v.billedAt ?? v.updatedAt,
    date: v.date,
  }
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shiftDays(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function VisitHistoryPage() {
  const { clinicId, branchId } = useClinic()
  const { services, loading: svcLoading } = useClinicServices(clinicId)

  const [fromDate, setFromDate] = useState(() => todayStr())
  const [toDate, setToDate] = useState(() => todayStr())
  const [search, setSearch] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { visits, loading, error, capReached } = useVisitHistory(
    clinicId,
    branchId,
    fromDate,
    toDate,
  )

  // Reset selection when range changes
  useEffect(() => {
    setSelectedId(null)
  }, [fromDate, toDate])

  function applyPreset(preset: 'today' | 'last7') {
    const today = todayStr()
    if (preset === 'today') {
      setFromDate(today)
      setToDate(today)
    } else {
      setFromDate(shiftDays(today, -6))
      setToDate(today)
    }
  }

  // Keep date order valid: clamp From if From > To
  function handleFromChange(v: string) {
    setFromDate(v)
    if (v > toDate) setToDate(v)
  }
  function handleToChange(v: string) {
    setToDate(v)
    if (v < fromDate) setFromDate(v)
  }

  const filteredVisits = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return visits.filter((v) => {
      // exclude waiting/in-progress/cancelled — history is for finished visits
      if (v.status !== 'billed' && v.status !== 'completed') return false
      // payment filter
      if (paymentFilter === 'split') {
        if ((v.payments?.length ?? 0) <= 1) return false
      } else if (paymentFilter === 'partial') {
        const paid = v.amountPaid ?? 0
        const total = v.billAmount ?? 0
        if (!(paid > 0 && paid < total)) return false
      } else if (paymentFilter !== 'all') {
        if (!(v.payments ?? []).some((p) => p.method === paymentFilter && p.amount > 0)) {
          return false
        }
      }
      // service filter
      if (selectedServiceIds.length > 0) {
        const has = (v.services ?? []).some((s) =>
          selectedServiceIds.includes(s.serviceId),
        )
        if (!has) return false
      }
      // search
      if (needle) {
        const hay = `${v.petName} ${v.ownerName} ${v.tokenDisplay}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [visits, paymentFilter, selectedServiceIds, search])

  const selectedVisit = filteredVisits.find((v) => v.id === selectedId) ?? null
  const hasPanel = !!selectedVisit

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Visit History
        </h1>
        {!loading && (
          <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold text-muted">
            {filteredVisits.length}
            {filteredVisits.length === visits.length ? '' : ` of ${visits.length}`}
          </span>
        )}
      </header>

      <HistoryFilters
        fromDate={fromDate}
        toDate={toDate}
        search={search}
        selectedServiceIds={selectedServiceIds}
        paymentFilter={paymentFilter}
        services={services}
        servicesLoading={svcLoading}
        onChangeFromDate={handleFromChange}
        onChangeToDate={handleToChange}
        onChangeSearch={setSearch}
        onChangeSelectedServiceIds={setSelectedServiceIds}
        onChangePaymentFilter={setPaymentFilter}
        onApplyPreset={applyPreset}
      />

      <HistorySummary visits={filteredVisits} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: list */}
        <div
          className="flex flex-col overflow-hidden border-r border-border-base"
          style={{ width: hasPanel ? '55%' : '100%', transition: 'width 0.2s ease' }}
        >
          {!loading && filteredVisits.length > 0 && (
            <div className={cn('grid gap-3 px-5 py-2 border-b border-border-base flex-shrink-0', COLS)}>
              {['Token', 'Pet', 'Owner', 'Doctor', 'Status', 'Payment', 'Amount', 'Time'].map((h) => (
                <span
                  key={h}
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted',
                    h === 'Amount' && 'text-right',
                  )}
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto" onClick={() => setSelectedId(null)}>
            {loading ? (
              <p className="px-5 py-8 text-[12px] text-muted">Loading…</p>
            ) : error ? (
              <p className="px-5 py-8 text-[12px] text-danger">{error}</p>
            ) : filteredVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <span className="text-[28px]">🐾</span>
                <p className="text-[13px] font-semibold text-muted">
                  No visits match these filters
                </p>
              </div>
            ) : (
              <>
                {filteredVisits.map((visit) => {
                  const isSelected = selectedId === visit.id
                  const isDimmed = visit.status === 'cancelled'
                  const ts = visit.billedAt ?? visit.updatedAt ?? visit.createdAt
                  const time = ts
                    ? ts.toDate().toLocaleString([], {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'

                  return (
                    <button
                      key={visit.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedId(isSelected ? null : visit.id)
                      }}
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
                          isSelected ? 'text-primary' : 'text-muted',
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
                      <AmountCell visit={visit} />
                      <span className="text-[11px] text-muted tabular-nums truncate">{time}</span>
                    </button>
                  )
                })}
                {capReached && (
                  <p className="px-5 py-3 text-[11px] text-muted italic">
                    Showing {HISTORY_RESULT_CAP} most recent. Narrow the date range to see older visits.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: detail panel — read-only */}
        {selectedVisit && clinicId && branchId && (
          <div className="flex-1 overflow-hidden flex flex-col bg-background">
            <VisitDetailPanel
              key={selectedVisit.id}
              visit={toCompletedVisit(selectedVisit)}
              clinicId={clinicId}
              branchId={branchId}
              onToast={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  )
}

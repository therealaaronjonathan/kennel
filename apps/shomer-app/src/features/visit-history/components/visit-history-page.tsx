import { useEffect, useMemo, useState } from 'react'
import { cn, formatInr } from '@/lib/utils'
import { useClinic } from '@/features/clinic'
import { useDoctors } from '@/features/checkin/services/use-doctors'
import { useClinicServices } from '@/features/vet/services/use-clinic-services'
import { VisitDetailPanel } from '@/features/dashboard/components/visit-detail-panel'
import type { CompletedVisit } from '@/features/dashboard/services/use-completed-visits'
import {
  PAYMENT_METHOD_LABELS,
} from '@/features/checkout/services/complete-billing'
import {
  useVisitHistory,
  type HistoryVisit,
} from '../services/use-visit-history'
import { usePaymentLedger } from '../services/use-payment-ledger'
import {
  HistoryFilters,
  type DatePreset,
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
    petWeightKg: v.petWeightKg,
    petTemperatureF: v.petTemperatureF,
    completedAt: v.billedAt ?? v.updatedAt,
    date: v.date,
  }
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function shiftDays(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** First and last calendar day of the month containing `d`. */
function calendarMonthBounds(d: Date): { from: string; to: string } {
  const from = new Date(d.getFullYear(), d.getMonth(), 1)
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { from: ymd(from), to: ymd(to) }
}

/** Inclusive calendar days between two YYYY-MM-DD strings. */
function daysInclusive(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const a = Date.UTC(fy, fm - 1, fd)
  const b = Date.UTC(ty, tm - 1, td)
  return Math.floor((b - a) / 86_400_000) + 1
}

const MAX_RANGE_DAYS = 31

export function VisitHistoryPage() {
  const { clinicId, branchId } = useClinic()
  const { services, loading: svcLoading } = useClinicServices(clinicId)
  const { data: branchDoctors = [], isLoading: doctorsLoading } = useDoctors(
    clinicId ?? '',
    branchId ?? '',
  )

  const [fromDate, setFromDate] = useState(() => todayStr())
  const [toDate, setToDate] = useState(() => todayStr())
  const [search, setSearch] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [doctorFilter, setDoctorFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedDoctorId = doctorFilter === 'all' ? null : doctorFilter

  const { visits, loading, error } = useVisitHistory(
    clinicId,
    branchId,
    fromDate,
    toDate,
    selectedDoctorId,
  )

  // Money totals come from the payment ledger (bucketed by day received), not
  // from the visits in range — so cross-day partials are attributed correctly.
  // When a doctor is selected, totals join ledger rows to that doctor's visits.
  const { totals: ledgerTotals } = usePaymentLedger(
    clinicId,
    branchId,
    fromDate,
    toDate,
    selectedDoctorId,
  )

  // Reset row selection when range or doctor changes
  useEffect(() => {
    setSelectedId(null)
  }, [fromDate, toDate, doctorFilter])

  // Branch switch should not keep another branch's doctor selected
  useEffect(() => {
    setDoctorFilter('all')
  }, [clinicId, branchId])

  function applyPreset(preset: DatePreset) {
    const now = new Date()
    const today = todayStr()
    if (preset === 'today') {
      setFromDate(today)
      setToDate(today)
      return
    }
    if (preset === 'last7') {
      setFromDate(shiftDays(today, -6))
      setToDate(today)
      return
    }
    if (preset === 'thisMonth') {
      const { from } = calendarMonthBounds(now)
      setFromDate(from)
      setToDate(today)
      return
    }
    const { from, to } = calendarMonthBounds(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    setFromDate(from)
    setToDate(to)
  }

  // Keep From ≤ To, and the inclusive span ≤ 31 days (one calendar month).
  function handleFromChange(v: string) {
    if (!v) return
    setFromDate(v)
    if (v > toDate) {
      setToDate(v)
      return
    }
    if (daysInclusive(v, toDate) > MAX_RANGE_DAYS) {
      setToDate(shiftDays(v, MAX_RANGE_DAYS - 1))
    }
  }
  function handleToChange(v: string) {
    if (!v) return
    setToDate(v)
    if (v < fromDate) {
      setFromDate(v)
      return
    }
    if (daysInclusive(fromDate, v) > MAX_RANGE_DAYS) {
      setFromDate(shiftDays(v, -(MAX_RANGE_DAYS - 1)))
    }
  }

  const doctors = useMemo(() => {
    const byId = new Map<string, string>()
    for (const d of branchDoctors) {
      if (d.id) byId.set(d.id, d.name)
    }
    for (const v of visits) {
      if (v.doctorId && !byId.has(v.doctorId)) {
        byId.set(v.doctorId, v.doctorName || 'Unknown')
      }
    }
    if (doctorFilter !== 'all' && !byId.has(doctorFilter)) {
      byId.set(doctorFilter, 'Selected doctor')
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [branchDoctors, visits, doctorFilter])

  const filteredVisits = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return visits.filter((v) => {
      // exclude waiting/in-progress/cancelled — history is for finished visits
      if (v.status !== 'billed' && v.status !== 'completed') return false
      if (doctorFilter !== 'all' && v.doctorId !== doctorFilter) return false
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
  }, [visits, doctorFilter, paymentFilter, selectedServiceIds, search])

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
        doctorFilter={doctorFilter}
        doctors={doctors}
        doctorsLoading={doctorsLoading}
        services={services}
        servicesLoading={svcLoading}
        onChangeFromDate={handleFromChange}
        onChangeToDate={handleToChange}
        onChangeSearch={setSearch}
        onChangeSelectedServiceIds={setSelectedServiceIds}
        onChangePaymentFilter={setPaymentFilter}
        onChangeDoctorFilter={setDoctorFilter}
        onApplyPreset={applyPreset}
      />

      <HistorySummary visits={filteredVisits} ledger={ledgerTotals} />

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

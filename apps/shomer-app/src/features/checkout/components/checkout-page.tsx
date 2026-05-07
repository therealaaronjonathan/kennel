import { useEffect, useState } from 'react'
import { MessageCircle, CheckCheck, Pill, CheckCircle, Syringe } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { cn, formatInr } from '@/lib/utils'
import { WhatsAppShareModal } from '@/components/blocks/whatsapp-share-modal'
import { ServicesSelect, type ServiceEntry } from '@/components/blocks/services-select'
import { PaymentMethodDialog } from '@/components/blocks/payment-method-dialog'
import { SplitPaymentDialog } from '@/components/blocks/split-payment-dialog'
import { useClinic } from '@/features/clinic'
import { useCompletedVisits, type CompletedVisit } from '@/features/dashboard/services/use-completed-visits'
import { useClinicName } from '@/features/clinic/hooks/use-clinic-name'
import { useClinicServices } from '@/features/vet/services/use-clinic-services'
import { useCheckoutDetail } from '../services/use-checkout-detail'
import {
  recordPayments,
  type PaymentEntry,
  type PaymentMethod,
} from '../services/complete-billing'

// ── Toast ────────────────────────────────────────────────────────────────────

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

// ── Dosage label ─────────────────────────────────────────────────────────────

function formatDosage(m: {
  morning: boolean; afternoon: boolean; evening: boolean; night: boolean; days: number
}): string {
  const times = [
    m.morning && 'Morning',
    m.afternoon && 'Afternoon',
    m.evening && 'Evening',
    m.night && 'Night',
  ].filter(Boolean) as string[]
  return `${times.length ? times.join(' · ') : 'As prescribed'} · ${m.days} day${m.days !== 1 ? 's' : ''}`
}

// ── Checkout detail panel ─────────────────────────────────────────────────────

interface CheckoutPanelProps {
  visit: CompletedVisit
  clinicId: string
  branchId: string
  clinicName: string | null
  onBilled: () => void
  onToast: (msg: string) => void
}

function CheckoutPanel({ visit, clinicId, branchId, clinicName, onBilled, onToast }: CheckoutPanelProps) {
  const { detail, loading: detailLoading } = useCheckoutDetail(clinicId, branchId, visit.id, visit.ownerId)
  const { services: catalogServices, loading: svcLoading } = useClinicServices(clinicId)

  const normalize = (svcs: typeof visit.services): ServiceEntry[] =>
    (svcs ?? []).map((s) => ({ ...s, quantity: s.quantity ?? 1 }))

  const [editedServices, setEditedServices] = useState<ServiceEntry[]>(() => normalize(visit.services))
  const [showWAModal, setShowWAModal] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showSplitDialog, setShowSplitDialog] = useState(false)

  // Reset services when a different visit is opened
  useEffect(() => {
    setEditedServices(normalize(visit.services))
  }, [visit.id, visit.services])

  const billTotal = editedServices.reduce((s, item) => s + item.quantity * item.price, 0)
  const existingPaid = visit.amountPaid ?? 0
  const hasPartial = existingPaid > 0 && existingPaid < billTotal

  const billing = useMutation({
    mutationFn: (payments: PaymentEntry[]) =>
      recordPayments(clinicId, branchId, visit.id, editedServices, payments),
    onSuccess: (_data, payments) => {
      setShowPaymentDialog(false)
      setShowSplitDialog(false)
      const paid = payments.reduce((s, p) => s + p.amount, 0)
      if (paid >= billTotal) {
        onToast(`${visit.petName} billed — ${formatInr(billTotal)}`)
        onBilled()
      } else {
        onToast(
          `${visit.petName} partial — ${formatInr(paid)} of ${formatInr(billTotal)}`,
        )
      }
    },
  })

  function confirmSingle(method: PaymentMethod) {
    billing.mutate([{ method, amount: billTotal }])
  }

  function confirmSplit(payments: PaymentEntry[]) {
    billing.mutate(payments)
  }

  const baseUrl = import.meta.env.VITE_APP_BASE_URL ?? 'https://shomer-app-test.web.app'
  const summaryLink = `${baseUrl}/visit/${visit.id}/summary?clinicId=${clinicId}&branchId=${branchId}`
  const waMessage = `Hi ${visit.ownerName}, ${visit.petName}'s consultation is complete. View the summary here: ${summaryLink}\n\nPlease visit the reception for billing. Thank you for choosing ${clinicName ?? 'us'}! 🐾`

  const hasDiagnosis = detail && detail.diagnoses.length > 0
  const hasMeds = detail && detail.medicines.length > 0
  const hasVaccines = detail && detail.vaccines.length > 0
  const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border-base px-6 py-4 flex-shrink-0">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[20px] font-bold text-primary leading-none">
            {visit.tokenDisplay}
          </span>
          <span className="text-[15px] font-bold text-foreground">{visit.petName}</span>
          {visit.isEmergency && (
            <span className="rounded-[3px] bg-danger/10 border border-danger/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-danger">
              ER
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-muted">
          {visit.ownerName} · {visit.doctorName}
        </p>

        {visit.complaints.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1.5">
              {visit.complaints.map((c) => (
                <span
                  key={c}
                  className="rounded-[3px] bg-surface-2 border border-border-base px-2 py-0.5 text-[11px] font-medium text-muted"
                >
                  {c}
                </span>
              ))}
            </div>
            {visit.otherComplaintText && (
              <p className="mt-1.5 text-[12px] text-foreground italic">
                "{visit.otherComplaintText}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {detailLoading ? (
          <p className="text-[12px] text-muted">Loading details…</p>
        ) : (
          <>
            {/* Diagnosis */}
            {hasDiagnosis && (
              <div className="space-y-2">
                <p className={labelClass}>Diagnosis</p>
                {detail.diagnoses.map((d, i) => (
                  <div key={i} className="rounded-[4px] border border-border-base bg-surface px-3 py-2.5 space-y-0.5">
                    <p className="text-[13px] font-semibold text-foreground">{d.name}</p>
                    {d.notes ? <p className="text-[12px] text-muted">{d.notes}</p> : null}
                  </div>
                ))}
              </div>
            )}

            {/* Consultation notes */}
            {visit.consultationNotes ? (
              <div className="space-y-1.5">
                <p className={labelClass}>Consultation Notes</p>
                <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                  {visit.consultationNotes}
                </p>
              </div>
            ) : null}

            {/* Prescription — medicines only */}
            {hasMeds && (
              <div className="rounded-[4px] border border-border-base bg-surface p-4 space-y-3">
                <p className={cn(labelClass, 'flex items-center gap-1.5')}>
                  <Pill size={10} />
                  Prescription
                </p>
                {detail.medicines.map((m, i) => (
                  <div key={i} className="space-y-0.5">
                    <p className="text-[13px] font-semibold text-foreground">{m.name}</p>
                    <p className="text-[11px] text-muted">{formatDosage(m)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Vaccines — separate section */}
            {hasVaccines && (
              <div className="rounded-[4px] border border-border-base bg-surface p-4 space-y-3">
                <p className={cn(labelClass, 'flex items-center gap-1.5')}>
                  <Syringe size={10} />
                  Vaccines
                </p>
                {detail.vaccines.map((v, i) => (
                  <div key={i} className="rounded-[4px] bg-surface-2 px-3 py-2 space-y-0.5">
                    <p className="text-[12px] font-semibold text-foreground">{v.name}</p>
                    {v.batch && <p className="text-[11px] text-muted">Batch: {v.batch}</p>}
                    {v.nextDue && <p className="text-[11px] text-muted">Next due: {v.nextDue}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Services — editable */}
            <div className="space-y-2">
              <p className={labelClass}>Services &amp; Bill</p>
              <ServicesSelect
                selected={editedServices}
                onChange={setEditedServices}
                items={catalogServices}
                loading={svcLoading}
              />
            </div>
          </>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t border-border-base px-6 py-4 flex-shrink-0">
        <div className="flex gap-3">
          <button
            type="button"
            disabled={!detail}
            onClick={() => setShowWAModal(true)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold transition-colors',
              detail
                ? 'text-foreground hover:border-primary hover:text-primary'
                : 'text-muted opacity-50 cursor-not-allowed',
            )}
          >
            <MessageCircle size={13} />
            Send WhatsApp
          </button>
          <button
            type="button"
            disabled={billing.isPending || editedServices.length === 0}
            onClick={() => {
              if (hasPartial) setShowSplitDialog(true)
              else setShowPaymentDialog(true)
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck size={13} />
            {billing.isPending ? 'Saving…' : hasPartial ? 'Continue Payment' : 'Mark Billed'}
          </button>
        </div>
      </div>

      <PaymentMethodDialog
        open={showPaymentDialog}
        total={billTotal}
        loading={billing.isPending}
        error={
          billing.isError
            ? (billing.error as Error)?.message ?? 'Failed to save. Try again.'
            : null
        }
        onCancel={() => {
          if (!billing.isPending) setShowPaymentDialog(false)
        }}
        onConfirm={confirmSingle}
        onSwitchToSplit={() => {
          setShowPaymentDialog(false)
          setShowSplitDialog(true)
        }}
      />

      <SplitPaymentDialog
        open={showSplitDialog}
        mode="billing"
        total={billTotal}
        initialPayments={visit.payments}
        loading={billing.isPending}
        error={
          billing.isError
            ? (billing.error as Error)?.message ?? 'Failed to save. Try again.'
            : null
        }
        onCancel={() => {
          if (!billing.isPending) setShowSplitDialog(false)
        }}
        onConfirm={confirmSplit}
      />

      {detail?.ownerPhone && (
        <WhatsAppShareModal
          open={showWAModal}
          onClose={() => setShowWAModal(false)}
          phone={detail.ownerPhone}
          ownerName={visit.ownerName}
          message={waMessage}
        />
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysAgo(visitDate: string, today: string): number {
  if (!visitDate) return 0
  const [y1, m1, d1] = visitDate.split('-').map(Number)
  const [y2, m2, d2] = today.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1).getTime()
  const b = new Date(y2, m2 - 1, d2).getTime()
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

function relativeDate(visitDate: string, today: string): string {
  const n = daysAgo(visitDate, today)
  if (n <= 0) return 'today'
  if (n === 1) return 'yesterday'
  return `${n} days ago`
}

// ── List item ────────────────────────────────────────────────────────────────

interface VisitListItemProps {
  visit: CompletedVisit
  selected: boolean
  showRelativeDate: boolean
  today: string
  onSelect: () => void
}

function VisitListItem({ visit, selected, showRelativeDate, today, onSelect }: VisitListItemProps) {
  const billAmt = (visit.services ?? []).reduce(
    (s, item) => s + (item.quantity ?? 1) * item.price,
    0,
  )
  const paid = visit.amountPaid ?? 0
  const isPartial = paid > 0 && paid < billAmt

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      className={cn(
        'w-full text-left px-5 py-4 border-b border-border-base transition-colors',
        selected ? 'bg-surface-2 border-l-2 border-l-primary' : 'hover:bg-surface',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-bold text-primary">
              {visit.tokenDisplay}
            </span>
            {visit.isEmergency && (
              <span className="rounded-[3px] bg-danger/10 border border-danger/25 px-1 py-0.5 text-[9px] font-bold uppercase text-danger">
                ER
              </span>
            )}
            {isPartial && (
              <span className="rounded-[3px] bg-warning/10 border border-warning/25 px-1 py-0.5 text-[9px] font-bold uppercase text-warning">
                Partial
              </span>
            )}
            {showRelativeDate && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-warning">
                {relativeDate(visit.date, today)}
              </span>
            )}
          </div>
          <p className="text-[13px] font-semibold text-foreground mt-0.5 truncate">
            {visit.petName}
          </p>
          <p className="text-[11px] text-muted truncate">{visit.ownerName}</p>
          <p className="text-[11px] text-muted">{visit.doctorName}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          {billAmt > 0 && (
            <span className="text-[13px] font-bold text-foreground tabular-nums">
              {formatInr(billAmt)}
            </span>
          )}
          {isPartial && (
            <span className="text-[10px] font-semibold text-warning tabular-nums">
              {formatInr(paid)} paid
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CheckoutPage() {
  const { clinicId, branchId } = useClinic()
  const { visits, loading, error } = useCompletedVisits(clinicId, branchId)
  const clinicName = useClinicName(clinicId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const today = todayString()

  const { todayVisits, carryOverVisits } = (() => {
    const todayList: CompletedVisit[] = []
    const carryList: CompletedVisit[] = []
    for (const v of visits) {
      if (v.date === today) todayList.push(v)
      else carryList.push(v)
    }
    // Carry-overs: oldest first (most stale at the top)
    carryList.sort((a, b) => a.date.localeCompare(b.date))
    return { todayVisits: todayList, carryOverVisits: carryList }
  })()

  const selectedVisit: CompletedVisit | null = visits.find((v) => v.id === selectedId) ?? null
  const hasPanel = !!selectedVisit

  function handleBilled() {
    setSelectedId(null)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Check-out
        </h1>
        {!loading && visits.length > 0 && (
          <div className="flex items-center gap-2">
            {carryOverVisits.length > 0 && (
              <span className="rounded-full bg-warning/10 border border-warning/25 px-2.5 py-0.5 text-[11px] font-bold text-warning">
                {carryOverVisits.length} carry-over
              </span>
            )}
            <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {todayVisits.length} today
            </span>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: pending billing list */}
        <div
          className="flex flex-col overflow-hidden border-r border-border-base"
          style={{ width: hasPanel ? '40%' : '100%', transition: 'width 0.2s ease' }}
        >
          <div className="flex-1 overflow-y-auto" onClick={() => setSelectedId(null)}>
            {loading ? (
              <p className="px-5 py-8 text-[12px] text-muted">Loading…</p>
            ) : error ? (
              <p className="px-5 py-8 text-[12px] text-danger">{error}</p>
            ) : visits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-20">
                <span className="text-[28px]">✓</span>
                <p className="text-[13px] font-semibold text-muted">All visits billed</p>
                <p className="text-[11px] text-muted opacity-60">
                  Completed consultations appear here
                </p>
              </div>
            ) : (
              <>
                {carryOverVisits.length > 0 && (
                  <>
                    <div className="px-5 py-2 border-b border-border-base bg-warning/5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-warning">
                        Pending from earlier days · {carryOverVisits.length}
                      </p>
                    </div>
                    {carryOverVisits.map((visit) => (
                      <VisitListItem
                        key={visit.id}
                        visit={visit}
                        selected={selectedId === visit.id}
                        showRelativeDate
                        today={today}
                        onSelect={() =>
                          setSelectedId(selectedId === visit.id ? null : visit.id)
                        }
                      />
                    ))}
                  </>
                )}

                {todayVisits.length > 0 && (
                  <>
                    {carryOverVisits.length > 0 && (
                      <div className="px-5 py-2 border-b border-border-base bg-surface">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                          Today · {todayVisits.length}
                        </p>
                      </div>
                    )}
                    {todayVisits.map((visit) => (
                      <VisitListItem
                        key={visit.id}
                        visit={visit}
                        selected={selectedId === visit.id}
                        showRelativeDate={false}
                        today={today}
                        onSelect={() =>
                          setSelectedId(selectedId === visit.id ? null : visit.id)
                        }
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: checkout detail */}
        {selectedVisit && clinicId && branchId && (
          <div className="flex-1 overflow-hidden flex flex-col bg-background">
            <CheckoutPanel
              key={selectedVisit.id}
              visit={selectedVisit}
              clinicId={clinicId}
              branchId={branchId}
              clinicName={clinicName}
              onBilled={handleBilled}
              onToast={(msg) => setToast(msg)}
            />
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

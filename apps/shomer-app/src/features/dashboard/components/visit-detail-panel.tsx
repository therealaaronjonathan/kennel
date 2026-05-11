import { useState } from 'react'
import { MessageCircle, ExternalLink, Pill, Syringe, Pencil, Scale } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useClinicName } from '@/features/clinic/hooks/use-clinic-name'
import { cn, formatInr } from '@/lib/utils'
import { WhatsAppShareModal } from '@/components/blocks/whatsapp-share-modal'
import { SplitPaymentDialog } from '@/components/blocks/split-payment-dialog'
import {
  PAYMENT_METHOD_LABELS,
  updatePayments,
  type PaymentEntry,
} from '@/features/checkout/services/complete-billing'
import { useVisitBill } from '../services/use-visit-bill'
import type { CompletedVisit } from '../services/use-completed-visits'

interface VisitDetailPanelProps {
  visit: CompletedVisit
  clinicId: string
  branchId: string
  onToast: (message: string) => void
  /** When true, billed visits show a Change payment method action. */
  canEditPaymentMethod?: boolean
}

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'

function formatDosage(m: {
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  days: number
  mealTiming?: 'before' | 'after'
}): string {
  const times = [
    m.morning && 'Morning',
    m.afternoon && 'Afternoon',
    m.evening && 'Evening',
    m.night && 'Night',
  ].filter(Boolean) as string[]

  const timingStr = times.length > 0 ? times.join(' · ') : 'As prescribed'
  const meal = m.mealTiming === 'before' ? ' · Before food' : m.mealTiming === 'after' ? ' · After food' : ''
  return `${timingStr} · ${m.days} day${m.days !== 1 ? 's' : ''}${meal}`
}

export function VisitDetailPanel({
  visit,
  clinicId,
  branchId,
  onToast,
  canEditPaymentMethod = false,
}: VisitDetailPanelProps) {
  const { detail, loading } = useVisitBill(clinicId, branchId, visit.id, visit.ownerId)
  const [showWAModal, setShowWAModal] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const clinicName = useClinicName(clinicId)

  const updateMethod = useMutation({
    mutationFn: (payments: PaymentEntry[]) =>
      updatePayments(clinicId, branchId, visit.id, payments, visit.billAmount ?? 0),
    onSuccess: () => {
      setShowPaymentDialog(false)
      onToast('Payment updated')
    },
  })

  // Services, bill, and consultation notes come directly from the visit doc —
  // no extra fetch needed, avoids putting arrays in useEffect deps.
  const services = Array.isArray(visit.services) ? visit.services : []
  const billAmount = visit.billAmount ?? 0
  const consultationNotes = visit.consultationNotes ?? ''

  const baseUrl = import.meta.env.VITE_APP_BASE_URL ?? 'https://shomer-app-test.web.app'
  const summaryLink = `${baseUrl}/visit/${visit.id}/summary?clinicId=${clinicId}&branchId=${branchId}`
  const waMessage = `Hi ${visit.ownerName}, ${visit.petName}'s consultation is complete.\n\nView the summary here:\n${summaryLink}\n\nThank you for choosing ${clinicName ?? 'us'}! 🐾`

  function handleShareConsultation() {
    if (!detail?.ownerPhone) {
      onToast('No phone number on file for this owner')
      return
    }
    setShowWAModal(true)
  }

  function handleViewConsultation() {
    window.open(summaryLink, '_blank')
  }

  const isConsultationDone = visit.status === 'completed' || visit.status === 'billed'
  const hasDiagnosis = detail && detail.diagnoses.length > 0
  const hasMedicines = detail && detail.medicines.length > 0
  const hasVaccines = detail && detail.vaccines.length > 0
  const hasServices = services.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border-base px-6 py-4 flex-shrink-0">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[20px] font-bold text-primary leading-none">
            {visit.tokenDisplay}
          </span>
          <span className="text-[15px] font-bold text-foreground">{visit.petName}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-muted">
          {visit.ownerName} · {visit.doctorName}
        </p>
        {typeof visit.petWeightKg === 'number' && (
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
            <Scale size={10} className="flex-shrink-0" />
            <span className="font-semibold text-foreground">{visit.petWeightKg} kg</span>
            <span>at time of visit</span>
          </p>
        )}

        {visit.complaints.length > 0 && (
          <div className="mt-3">
            <p className={cn(labelClass, 'mb-1.5')}>Complaints</p>
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
        {loading ? (
          <p className="text-[12px] text-muted">Loading details…</p>
        ) : !detail ? null : (
          <>
            {/* Diagnosis */}
            {hasDiagnosis && (
              <div className="space-y-2">
                <p className={labelClass}>Diagnosis</p>
                {detail.diagnoses.map((d, i) => (
                  <div
                    key={i}
                    className="rounded-[4px] border border-border-base bg-surface px-3 py-2.5 space-y-1"
                  >
                    <p className="text-[13px] font-semibold text-foreground">{d.name}</p>
                    {d.notes ? (
                      <p className="text-[12px] text-muted leading-relaxed">{d.notes}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* Consultation notes */}
            {consultationNotes ? (
              <div className="space-y-1.5">
                <p className={labelClass}>Consultation Notes</p>
                <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                  {consultationNotes}
                </p>
              </div>
            ) : null}

            {/* Prescription — medicines only */}
            {hasMedicines && (
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
                  <div key={i} className="rounded-[4px] bg-surface-2 px-3 py-2.5 space-y-0.5">
                    <p className="text-[12px] font-semibold text-foreground">{v.name}</p>
                    {v.batch ? (
                      <p className="text-[11px] text-muted">Batch: {v.batch}</p>
                    ) : null}
                    {v.nextDue ? (
                      <p className="text-[11px] text-muted">Next due: {v.nextDue}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* Services — itemized bill */}
            {hasServices && (
              <div className="space-y-1.5">
                <p className={labelClass}>Services Availed</p>
                <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
                  {services.map((s, i) => (
                    <div
                      key={s.serviceId ?? i}
                      className="flex items-center justify-between px-3 py-2 bg-surface"
                    >
                      <span className="text-[13px] text-foreground">{s.name}</span>
                      <span className="text-[13px] font-semibold text-foreground">
                        {formatInr(s.price)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 bg-surface-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                      Total
                    </span>
                    <span className="text-[14px] font-bold text-primary">
                      {formatInr(billAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Payments — shown when billed or when any payment recorded */}
            {(() => {
              const payments = visit.payments ?? []
              const paid = visit.amountPaid ?? 0
              const total = visit.billAmount ?? 0
              const isBilled = visit.status === 'billed'
              const isPartial = !isBilled && paid > 0 && paid < total
              if (!isBilled && !isPartial) return null

              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className={labelClass}>
                      {isBilled
                        ? payments.length > 1
                          ? 'Payment Split'
                          : 'Payment Method'
                        : 'Partial Payment'}
                    </p>
                    {isBilled && canEditPaymentMethod && (
                      <button
                        type="button"
                        onClick={() => setShowPaymentDialog(true)}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:opacity-85 transition-opacity"
                      >
                        <Pencil size={11} />
                        Change
                      </button>
                    )}
                  </div>
                  <div className="rounded-[4px] border border-border-base bg-surface overflow-hidden">
                    {payments.length === 0 ? (
                      <div className="px-3 py-2.5 text-[13px] font-semibold text-muted">
                        Not recorded
                      </div>
                    ) : (
                      <div className="divide-y divide-border-base">
                        {payments.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2"
                          >
                            <span className="text-[13px] font-semibold text-foreground">
                              {PAYMENT_METHOD_LABELS[p.method]}
                            </span>
                            <span className="text-[13px] font-semibold text-foreground tabular-nums">
                              {formatInr(p.amount)}
                            </span>
                          </div>
                        ))}
                        {isPartial && (
                          <div className="flex items-center justify-between px-3 py-2 bg-warning/5">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-warning">
                              Remaining
                            </span>
                            <span className="text-[13px] font-bold text-warning tabular-nums">
                              {formatInr(total - paid)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {!hasDiagnosis && !hasMedicines && !hasVaccines && !hasServices && !consultationNotes && (
              <p className="text-[12px] text-muted">No consultation details recorded.</p>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="border-t border-border-base px-6 py-4 flex-shrink-0 flex gap-3">
        <button
          type="button"
          disabled={!isConsultationDone || !detail || loading}
          onClick={handleShareConsultation}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold transition-colors',
            isConsultationDone && detail && !loading
              ? 'text-foreground hover:border-primary hover:text-primary'
              : 'text-muted opacity-50 cursor-not-allowed',
          )}
        >
          <MessageCircle size={13} />
          Share Consultation
        </button>
        <button
          type="button"
          disabled={!isConsultationDone}
          onClick={handleViewConsultation}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white transition-opacity',
            isConsultationDone
              ? 'hover:opacity-85'
              : 'opacity-50 cursor-not-allowed',
          )}
        >
          <ExternalLink size={13} />
          View Consultation
        </button>
      </div>

      {detail?.ownerPhone && (
        <WhatsAppShareModal
          open={showWAModal}
          onClose={() => setShowWAModal(false)}
          phone={detail.ownerPhone}
          ownerName={visit.ownerName}
          message={waMessage}
        />
      )}

      {canEditPaymentMethod && (
        <SplitPaymentDialog
          open={showPaymentDialog}
          mode="edit"
          total={visit.billAmount ?? 0}
          initialPayments={visit.payments}
          loading={updateMethod.isPending}
          error={
            updateMethod.isError
              ? (updateMethod.error as Error)?.message ?? 'Failed to update. Try again.'
              : null
          }
          onCancel={() => {
            if (!updateMethod.isPending) setShowPaymentDialog(false)
          }}
          onConfirm={(payments) => updateMethod.mutate(payments)}
        />
      )}
    </div>
  )
}

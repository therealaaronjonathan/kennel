import { useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Pill,
  Receipt,
  Scale,
  Stethoscope,
  Syringe,
  Thermometer,
  Wallet,
} from 'lucide-react'
import { cn, formatInr } from '@/lib/utils'
import { PAYMENT_METHOD_LABELS } from '@/features/checkout/services/complete-billing'
import type { LastVisitSummary } from '@/features/vet/services/use-visit-detail'

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'

function formatDateLong(yyyymmdd: string): string {
  if (!yyyymmdd) return ''
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return yyyymmdd
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatRelative(yyyymmdd: string): string {
  if (!yyyymmdd) return ''
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return ''
  const past = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  past.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - past.getTime()) / 86_400_000)
  if (diffDays <= 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) {
    const w = Math.round(diffDays / 7)
    return `${w} week${w === 1 ? '' : 's'} ago`
  }
  if (diffDays < 365) {
    const mo = Math.round(diffDays / 30)
    return `${mo} month${mo === 1 ? '' : 's'} ago`
  }
  const yrs = Math.round(diffDays / 365)
  return `${yrs} year${yrs === 1 ? '' : 's'} ago`
}

function isOverdue(yyyymmdd: string | undefined): boolean {
  if (!yyyymmdd) return false
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return false
  const target = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return target.getTime() < today.getTime()
}

function formatTimingDays(m: {
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
  const timing = times.length ? times.join(' · ') : 'As prescribed'
  const meal = m.mealTiming === 'before' ? ' · Before food' : m.mealTiming === 'after' ? ' · After food' : ''
  return `${timing} · ${m.days} day${m.days !== 1 ? 's' : ''}${meal}`
}

function formatDose(type?: string, quantity?: string): string | null {
  if (!quantity) return null
  if (type === 'tablet') {
    if (quantity === '1') return 'Full tablet'
    if (quantity === '1/2') return 'Half tablet'
    return `${quantity} tablet`
  }
  if (type === 'syrup') return `${quantity} ml`
  if (type === 'other') return `${quantity} ml`
  return quantity
}

interface LastVisitCardProps {
  visit: LastVisitSummary
  branchName?: string | null
  footer?: ReactNode
}

export function LastVisitCard({ visit, branchName, footer }: LastVisitCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-[4px] border border-border-base bg-surface-2 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'w-full text-left px-4 py-3 bg-surface hover:bg-surface-2/50 transition-colors',
          open && 'border-b border-border-base',
        )}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className={cn(labelClass, 'mb-1')}>Last Visit</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[14px] font-bold text-foreground">
                {formatDateLong(visit.date)}
              </span>
              <span className="text-[11px] text-muted">{formatRelative(visit.date)}</span>
            </div>
            {visit.doctorName && (
              <p className="mt-0.5 text-[12px] text-muted">
                Seen by <span className="font-semibold text-foreground/80">{visit.doctorName}</span>
              </p>
            )}
            {branchName && (
              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
                <MapPin size={10} className="flex-shrink-0" />
                {branchName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {visit.isEmergency && (
              <span className="flex items-center gap-1 rounded-[3px] bg-danger/10 border border-danger/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-danger">
                <AlertTriangle size={9} />
                ER
              </span>
            )}
            {visit.service && (
              <span className="rounded-[3px] bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-primary">
                {visit.service}
              </span>
            )}
            {open ? (
              <ChevronUp size={14} className="text-muted ml-1" />
            ) : (
              <ChevronDown size={14} className="text-muted ml-1" />
            )}
          </div>
        </div>
        {!open && (
          <p className="mt-1.5 text-[11px] text-muted">
            Tap to view diagnosis, medicines, vaccines, services and payment.
          </p>
        )}
      </button>

      {open && (
        <div className="p-4 space-y-4">
          {(typeof visit.petWeightKg === 'number' || typeof visit.petTemperatureF === 'number') && (
            <div className="flex items-center gap-4 flex-wrap">
              {typeof visit.petWeightKg === 'number' && (
                <div className="flex items-center gap-2">
                  <Scale size={10} className="text-muted flex-shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                    Weight
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">{visit.petWeightKg} kg</span>
                </div>
              )}
              {typeof visit.petTemperatureF === 'number' && (
                <div className="flex items-center gap-2">
                  <Thermometer size={10} className="text-muted flex-shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                    Temp
                  </span>
                  <span className="text-[13px] font-semibold text-foreground">{visit.petTemperatureF}°F</span>
                </div>
              )}
            </div>
          )}

          {(visit.complaints.length > 0 || visit.otherComplaintText) && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                Complaints
              </p>
              {visit.complaints.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {visit.complaints.map((c) => (
                    <span
                      key={c}
                      className="rounded-[3px] bg-surface border border-border-base px-2 py-0.5 text-[11px] font-medium text-muted"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {visit.otherComplaintText && (
                <p className="text-[12px] text-foreground italic leading-relaxed">
                  "{visit.otherComplaintText}"
                </p>
              )}
            </div>
          )}

          {visit.diagnoses.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                <Stethoscope size={10} />
                Diagnosis
              </p>
              <div className="space-y-1.5">
                {visit.diagnoses.map((d, i) => (
                  <div key={i} className="rounded-[4px] bg-surface px-3 py-2">
                    <p className="text-[13px] font-semibold text-foreground">{d.name}</p>
                    {d.notes && (
                      <p className="mt-0.5 text-[12px] text-muted leading-relaxed">{d.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {visit.consultationNotes && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                Doctor's Notes
              </p>
              <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">
                {visit.consultationNotes}
              </p>
            </div>
          )}

          {visit.medicines.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                <Pill size={10} />
                Medicines
              </p>
              <div className="space-y-1.5">
                {visit.medicines.map((m, i) => {
                  const dose = formatDose(m.type, m.quantity)
                  return (
                    <div key={i} className="rounded-[4px] bg-surface px-3 py-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-foreground">{m.name}</p>
                        {m.type && (
                          <span className="rounded-[3px] bg-surface-2 border border-border-base px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted">
                            {m.type}
                          </span>
                        )}
                      </div>
                      {dose && (
                        <p className="mt-0.5 text-[11px] font-semibold text-foreground/80">{dose}</p>
                      )}
                      <p className="mt-0.5 text-[11px] text-muted">{formatTimingDays(m)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {visit.vaccines.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                <Syringe size={10} />
                Vaccines
              </p>
              <div className="space-y-1.5">
                {visit.vaccines.map((v, i) => {
                  const overdue = isOverdue(v.nextDue)
                  return (
                    <div key={i} className="rounded-[4px] bg-surface px-3 py-2 space-y-0.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-foreground">{v.name}</p>
                        {overdue && (
                          <span className="rounded-[3px] bg-danger/10 border border-danger/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-danger">
                            Overdue
                          </span>
                        )}
                      </div>
                      {v.batch && <p className="text-[11px] text-muted">Batch: {v.batch}</p>}
                      {v.nextDue && (
                        <p className={cn('text-[11px]', overdue ? 'font-semibold text-danger' : 'text-muted')}>
                          Next due: {formatDateLong(v.nextDue)}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {visit.services.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                <Receipt size={10} />
                Services Availed
              </p>
              <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
                {visit.services.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface gap-2">
                    <span className="flex-1 text-[12px] text-foreground truncate">{s.name}</span>
                    {(s.quantity ?? 1) > 1 && (
                      <span className="text-[11px] text-muted tabular-nums">{s.quantity}×</span>
                    )}
                    <span className="text-[12px] font-semibold text-foreground tabular-nums">
                      {formatInr((s.quantity ?? 1) * s.price)}
                    </span>
                  </div>
                ))}
                {typeof visit.billAmount === 'number' && (
                  <div className="flex items-center justify-between px-3 py-2 bg-surface-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                      Total
                    </span>
                    <span className="text-[13px] font-bold text-primary tabular-nums">
                      {formatInr(visit.billAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {visit.payments && visit.payments.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                <Wallet size={10} />
                Payment
              </p>
              <div className="rounded-[4px] bg-surface px-3 py-2 space-y-1">
                {visit.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-foreground">
                      {PAYMENT_METHOD_LABELS[p.method]}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-foreground tabular-nums">
                        {formatInr(p.amount)}
                      </span>
                      {i === 0 && visit.status === 'billed' && (
                        <span className="rounded-[3px] bg-success/10 border border-success/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-success">
                          Billed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visit.diagnoses.length === 0 &&
            !visit.consultationNotes &&
            visit.medicines.length === 0 &&
            visit.vaccines.length === 0 &&
            visit.services.length === 0 &&
            visit.complaints.length === 0 && (
              <p className="text-[12px] text-muted">No notes recorded for last visit.</p>
            )}
        </div>
      )}

      {open && footer}
    </div>
  )
}

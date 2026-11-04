import { useEffect, useRef, useState } from 'react'
import { formatInr } from '@/lib/utils'
import {
  amountDue,
  discountLine,
  quoteDiscount,
  type DiscountApprover,
  type DiscountKind,
  type VisitDiscount,
} from '../services/discount'
import type { ApproverOption } from '../services/use-approvers'

const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'

interface DiscountDialogProps {
  open: boolean
  subtotal: number
  alreadyPaid: number
  /** Saved discount, so reopening edits the one discount on this visit. */
  initial: VisitDiscount | null
  initialApproverId: string
  /** Pre-select the signed-in person when they are on the list and nothing is saved. */
  defaultApproverId: string
  doctors: ApproverOption[]
  staff: ApproverOption[]
  optionsLoading: boolean
  saving: boolean
  onClose: () => void
  onSubmit: (discount: VisitDiscount, approver: DiscountApprover) => void
}

export function DiscountDialog({
  open,
  subtotal,
  alreadyPaid,
  initial,
  initialApproverId,
  defaultApproverId,
  doctors,
  staff,
  optionsLoading,
  saving,
  onClose,
  onSubmit,
}: DiscountDialogProps) {
  const [kind, setKind] = useState<DiscountKind>(initial?.kind ?? 'amount')
  const [rawValue, setRawValue] = useState(initial ? String(initial.value) : '')
  const [approverId, setApproverId] = useState(initialApproverId || defaultApproverId)
  const filledForOpen = useRef(false)

  useEffect(() => {
    if (!open) {
      filledForOpen.current = false
      return
    }
    if (filledForOpen.current) return
    filledForOpen.current = true
    setKind(initial?.kind ?? 'amount')
    setRawValue(initial ? String(initial.value) : '')
    setApproverId(initialApproverId || defaultApproverId)
  }, [open, initial, initialApproverId, defaultApproverId])

  if (!open) return null

  const quote = quoteDiscount({ subtotal, kind, rawValue, alreadyPaid })
  const preview = quote.ok ? quote.discount : null
  const approver = [...doctors, ...staff].find((p) => p.id === approverId) ?? null
  const ready = quote.ok && !!preview && !!approver && !optionsLoading
  const error = !quote.ok ? quote.error : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20">
      <div className="w-[360px] rounded-[6px] bg-background border border-border-base shadow-lg p-5 space-y-4">
        <div>
          <p className="text-[14px] font-bold text-foreground">
            {initial ? 'Discount' : 'Add Discount'}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">One discount on this visit.</p>
        </div>

        <div className="rounded-[4px] border border-border-base bg-surface px-3 py-2.5 flex items-center justify-between">
          <span className={labelClass}>Bill amount</span>
          <span className="text-[16px] font-bold text-foreground tabular-nums">{formatInr(subtotal)}</span>
        </div>

        <div className="space-y-2">
          <span className={labelClass}>Discount amount</span>
          <div className="flex gap-2">
            <KindButton active={kind === 'amount'} onClick={() => setKind('amount')}>
              Rupees
            </KindButton>
            <KindButton active={kind === 'percent'} onClick={() => setKind('percent')}>
              Percent
            </KindButton>
          </div>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder={kind === 'percent' ? '10' : '200'}
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            className="w-full rounded-[4px] border border-border-base bg-background px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors tabular-nums"
          />
        </div>

        <label className="block space-y-1.5">
          <span className={labelClass}>Approved by</span>
          <select
            value={approverId}
            onChange={(e) => setApproverId(e.target.value)}
            disabled={optionsLoading}
            className="w-full rounded-[4px] border border-border-base bg-background px-3 py-[9px] text-[13px] text-foreground focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
          >
            <option value="">{optionsLoading ? 'Loading…' : 'Select a person'}</option>
            {doctors.length > 0 && (
              <optgroup label="Doctors">
                {doctors.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
            {staff.length > 0 && (
              <optgroup label="Staff">
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        {preview && (
          <div className="space-y-1 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-muted">{discountLine(preview)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-foreground">Amount due</span>
              <span className="text-[14px] font-bold text-primary tabular-nums">
                {formatInr(amountDue(subtotal, preview))}
              </span>
            </div>
          </div>
        )}

        {error && <p className="text-[12px] font-semibold text-danger">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex-1 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready || saving}
            onClick={() => {
              if (!preview || !approver) return
              onSubmit(preview, approver)
            }}
            className="flex-1 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Add Discount'}
          </button>
        </div>
      </div>
    </div>
  )
}

function KindButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'flex-1 rounded-[4px] bg-primary/10 border border-primary px-3 py-[7px] text-[12px] font-semibold text-primary'
          : 'flex-1 rounded-[4px] border border-border-base px-3 py-[7px] text-[12px] font-semibold text-muted hover:text-foreground'
      }
    >
      {children}
    </button>
  )
}

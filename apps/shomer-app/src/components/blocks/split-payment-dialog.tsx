import { useEffect, useMemo, useState } from 'react'
import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import { cn, formatInr } from '@/lib/utils'
import { ErrorDetails } from '@/components/primitives/error-details'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentEntry,
  type PaymentMethod,
} from '@/features/checkout/services/complete-billing'

const METHOD_ICONS: Record<PaymentMethod, React.ComponentType<{ size?: number; className?: string }>> = {
  cash: Banknote,
  card: CreditCard,
  upi: Smartphone,
}

interface RowState {
  method: PaymentMethod
  enabled: boolean
  amount: string  // raw input value
}

export type SplitDialogMode = 'billing' | 'edit'

interface SplitPaymentDialogProps {
  open: boolean
  mode: SplitDialogMode
  total: number
  /** Pre-fill rows with existing payments (for partial resume / edit). */
  initialPayments?: PaymentEntry[]
  loading?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (payments: PaymentEntry[]) => void
}

function buildInitialRows(initial: PaymentEntry[] | undefined): RowState[] {
  return PAYMENT_METHODS.map((m) => {
    const existing = initial?.find((p) => p.method === m)
    return {
      method: m,
      enabled: !!existing && existing.amount > 0,
      amount: existing && existing.amount > 0 ? String(existing.amount) : '',
    }
  })
}

function parseAmount(raw: string): number {
  if (!raw) return 0
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.round(n)
}

export function SplitPaymentDialog({
  open,
  mode,
  total,
  initialPayments,
  loading = false,
  error = null,
  onCancel,
  onConfirm,
}: SplitPaymentDialogProps) {
  const [rows, setRows] = useState<RowState[]>(() => buildInitialRows(initialPayments))

  // Reset rows whenever the dialog opens or initialPayments changes
  useEffect(() => {
    if (open) {
      setRows(buildInitialRows(initialPayments))
    }
  }, [open, initialPayments])

  // Escape to cancel
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel, loading])

  const enabledRows = useMemo(() => rows.filter((r) => r.enabled), [rows])
  const paid = useMemo(
    () => enabledRows.reduce((s, r) => s + parseAmount(r.amount), 0),
    [enabledRows],
  )
  const remaining = total - paid

  function toggleRow(method: PaymentMethod) {
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }))
      const idx = next.findIndex((r) => r.method === method)
      if (idx === -1) return prev
      const row = next[idx]
      const turningOn = !row.enabled
      row.enabled = turningOn

      if (turningOn) {
        // Autofill remaining into this newly-enabled row if it's blank
        const otherSum = next
          .filter((r, i) => i !== idx && r.enabled)
          .reduce((s, r) => s + parseAmount(r.amount), 0)
        const fill = total - otherSum
        if (!row.amount && fill > 0) {
          row.amount = String(fill)
        }
      } else {
        row.amount = ''
      }
      return next
    })
  }

  function setRowAmount(method: PaymentMethod, value: string) {
    // allow only digits; strip everything else
    const cleaned = value.replace(/[^\d]/g, '')
    setRows((prev) =>
      prev.map((r) => (r.method === method ? { ...r, amount: cleaned } : r)),
    )
  }

  if (!open) return null

  // Determine save state
  const overpaid = paid > total
  const noPayment = paid <= 0
  const fullyPaid = paid === total
  const isEdit = mode === 'edit'

  let saveLabel: string
  let saveDisabled: boolean
  let saveHint: string | null = null

  if (isEdit) {
    saveLabel = loading ? 'Saving…' : 'Save'
    saveDisabled = loading || !fullyPaid
    if (overpaid) saveHint = 'Total exceeds bill.'
    else if (!fullyPaid) saveHint = `Must add up to ${formatInr(total)}.`
  } else {
    // billing mode
    if (overpaid) {
      saveLabel = 'Mark Billed'
      saveDisabled = true
      saveHint = 'Total exceeds bill.'
    } else if (fullyPaid) {
      saveLabel = loading ? 'Saving…' : 'Mark Billed'
      saveDisabled = loading
    } else {
      saveLabel = loading ? 'Saving…' : 'Save Partial Payment'
      saveDisabled = loading || noPayment
    }
  }

  function handleSave() {
    const payments: PaymentEntry[] = rows
      .filter((r) => r.enabled)
      .map((r) => ({ method: r.method, amount: parseAmount(r.amount) }))
      .filter((p) => p.amount > 0)
    onConfirm(payments)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="w-full max-w-md rounded-[4px] bg-surface border border-border-base shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border-base px-5 py-4">
          <p className="text-[14px] font-bold text-foreground">
            {isEdit ? 'Edit payment split' : 'Split or partial payment'}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {isEdit
              ? 'Amounts must add up to the bill total.'
              : 'Enable each method used. Amounts can be less than total for a partial payment.'}
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Total */}
          <div className="flex items-baseline justify-between rounded-[4px] bg-surface-2 border border-border-base px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Total
            </span>
            <span className="text-[20px] font-bold text-primary tabular-nums">
              {formatInr(total)}
            </span>
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {rows.map((r) => {
              const Icon = METHOD_ICONS[r.method]
              return (
                <div
                  key={r.method}
                  role="button"
                  tabIndex={loading ? -1 : 0}
                  aria-pressed={r.enabled}
                  onClick={() => {
                    if (loading) return
                    toggleRow(r.method)
                  }}
                  onKeyDown={(e) => {
                    if (loading) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleRow(r.method)
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-[4px] border px-3 py-2.5 transition-colors cursor-pointer select-none',
                    r.enabled
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border-base bg-surface hover:border-foreground/20',
                    loading && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center gap-2 px-2 py-1 text-[12px] font-semibold min-w-[110px]',
                      r.enabled ? 'text-primary' : 'text-muted',
                    )}
                  >
                    <Icon size={14} />
                    {PAYMENT_METHOD_LABELS[r.method]}
                  </div>
                  <div className="flex-1 flex items-center justify-end gap-1.5">
                    <span
                      className={cn(
                        'text-[13px] font-semibold',
                        r.enabled ? 'text-foreground' : 'text-muted/50',
                      )}
                    >
                      ₹
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={r.amount}
                      onChange={(e) => setRowAmount(r.method, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      disabled={!r.enabled || loading}
                      placeholder="0"
                      className={cn(
                        'w-28 rounded-[3px] border bg-background px-2 py-1 text-right text-[13px] font-semibold tabular-nums focus:outline-none transition-colors',
                        r.enabled
                          ? 'border-border-base text-foreground focus:border-primary cursor-text'
                          : 'border-transparent text-muted/40 cursor-pointer',
                      )}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="flex items-baseline justify-between text-[12px]">
            <span className="text-muted">
              Paid <span className="font-bold text-foreground tabular-nums">{formatInr(paid)}</span>
              {' '}/ {formatInr(total)}
            </span>
            <span
              className={cn(
                'font-bold tabular-nums',
                overpaid ? 'text-danger' : remaining > 0 ? 'text-warning' : 'text-success',
              )}
            >
              {overpaid
                ? `Over by ${formatInr(paid - total)}`
                : remaining > 0
                  ? `Remaining ${formatInr(remaining)}`
                  : 'Fully paid'}
            </span>
          </div>

          {(error || saveHint) && (
            <ErrorDetails message={error ?? saveHint ?? ''} />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-border-base px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveDisabled}
            className="flex-1 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

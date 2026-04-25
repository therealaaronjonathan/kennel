import { useEffect, useState } from 'react'
import { AlertTriangle, Banknote, CreditCard, Smartphone } from 'lucide-react'
import { cn, formatInr } from '@/lib/utils'
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '@/features/checkout/services/complete-billing'

const METHOD_ORDER: PaymentMethod[] = ['cash', 'card', 'upi']

const METHOD_ICONS: Record<PaymentMethod, React.ComponentType<{ size?: number; className?: string }>> = {
  cash: Banknote,
  card: CreditCard,
  upi: Smartphone,
}

interface PaymentMethodDialogProps {
  open: boolean
  /** When provided, dialog shows the bill total and uses Confirm Billing wording. */
  total?: number
  /** When provided, dialog shows the currently-saved method as context. */
  currentMethod?: PaymentMethod
  loading?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (method: PaymentMethod) => void
}

export function PaymentMethodDialog({
  open,
  total,
  currentMethod,
  loading = false,
  error = null,
  onCancel,
  onConfirm,
}: PaymentMethodDialogProps) {
  const [selected, setSelected] = useState<PaymentMethod | null>(null)
  const isBilling = total !== undefined

  // Reset on open/close
  useEffect(() => {
    if (!open) setSelected(null)
  }, [open])

  // Escape to cancel
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel, loading])

  if (!open) return null

  const title = isBilling ? 'Confirm payment' : 'Change payment method'
  const ctaLabel = isBilling ? 'Mark Billed' : 'Save'

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
          <p className="text-[14px] font-bold text-foreground">{title}</p>
          {currentMethod && (
            <p className="mt-1 text-[11px] text-muted">
              Current: {PAYMENT_METHOD_LABELS[currentMethod]}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {isBilling && (
            <div className="flex items-baseline justify-between rounded-[4px] bg-surface-2 border border-border-base px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Total
              </span>
              <span className="text-[20px] font-bold text-primary tabular-nums">
                {formatInr(total ?? 0)}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Payment method
            </p>
            <div className="grid grid-cols-3 gap-2">
              {METHOD_ORDER.map((m) => {
                const Icon = METHOD_ICONS[m]
                const active = selected === m
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={loading}
                    onClick={() => setSelected(m)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 rounded-[4px] border px-3 py-4 text-[13px] font-semibold transition-colors disabled:opacity-50',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border-base bg-surface text-muted hover:border-foreground/20 hover:text-foreground',
                    )}
                  >
                    <Icon size={18} />
                    {PAYMENT_METHOD_LABELS[m]}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-[4px] border border-danger/30 bg-danger/5 px-3 py-2">
              <AlertTriangle size={12} className="text-danger flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-danger">{error}</p>
            </div>
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
            onClick={() => selected && onConfirm(selected)}
            disabled={loading || !selected}
            className="flex-1 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

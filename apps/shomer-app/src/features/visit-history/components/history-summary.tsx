import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import { formatInr } from '@/lib/utils'
import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from '@/features/checkout/services/complete-billing'
import type { HistoryVisit } from '../services/use-visit-history'
import type { LedgerTotals } from '../services/use-payment-ledger'

interface HistorySummaryProps {
  visits: HistoryVisit[]
  /** Money totals from the payment ledger, bucketed by the day money was received. */
  ledger: LedgerTotals
  /** Rupees discounted on finished visits in the selected dates. */
  discountTotal: number
}

const METHOD_ICONS: Record<PaymentMethod, React.ComponentType<{ size?: number; className?: string }>> = {
  cash: Banknote,
  card: CreditCard,
  upi: Smartphone,
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
}

export function HistorySummary({ visits, ledger, discountTotal }: HistorySummaryProps) {
  // Money figures come from the payment ledger (bucketed by the day cash was
  // received), so a partial paid across days lands on the right day. Visit count
  // stays visit-based — it counts consultations, not money.
  const totalEarned = ledger.totalEarned
  const byMethod = ledger.byMethod
  const completedCount = visits.filter(
    (v) => v.status === 'billed' || v.status === 'completed',
  ).length

  return (
    <div className="grid grid-cols-2 gap-3 px-6 py-4 border-b border-border-base bg-background min-[1180px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(300px,1.85fr)_minmax(0,1fr)]">
      {/* Total Earned */}
      <div className="rounded-[4px] border border-border-base bg-surface px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          Total Earned
        </p>
        <p className="mt-1 text-[22px] font-bold text-primary tabular-nums leading-none">
          {formatInr(totalEarned)}
        </p>
      </div>

      {/* Visits */}
      <div className="rounded-[4px] border border-border-base bg-surface px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          Visits Completed
        </p>
        <p className="mt-1 text-[22px] font-bold text-foreground tabular-nums leading-none">
          {completedCount}
        </p>
      </div>

      {/* By Method */}
      <div className="rounded-[4px] border border-border-base bg-surface px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          By Method
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          {PAYMENT_METHODS.map((m) => {
            const Icon = METHOD_ICONS[m]
            return (
              <div key={m} className="flex flex-col items-start gap-0.5 min-w-0">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-muted whitespace-nowrap">
                  <Icon size={10} />
                  {METHOD_LABELS[m]}
                </span>
                <span className="text-[13px] font-bold text-foreground tabular-nums whitespace-nowrap">
                  {formatInr(byMethod[m])}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-[4px] border border-border-base bg-surface px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          Discounts
        </p>
        <p className="mt-1 text-[22px] font-bold text-foreground tabular-nums leading-none">
          {formatInr(discountTotal)}
        </p>
      </div>
    </div>
  )
}

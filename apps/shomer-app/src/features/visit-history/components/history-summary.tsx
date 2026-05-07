import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import { formatInr } from '@/lib/utils'
import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from '@/features/checkout/services/complete-billing'
import type { HistoryVisit } from '../services/use-visit-history'

interface HistorySummaryProps {
  visits: HistoryVisit[]
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

export function HistorySummary({ visits }: HistorySummaryProps) {
  const totalEarned = visits.reduce((s, v) => s + (v.amountPaid ?? 0), 0)
  const completedCount = visits.filter(
    (v) => v.status === 'billed' || v.status === 'completed',
  ).length

  const byMethod: Record<PaymentMethod, number> = { cash: 0, card: 0, upi: 0 }
  for (const v of visits) {
    for (const p of v.payments ?? []) {
      byMethod[p.method] += p.amount
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-6 py-4 border-b border-border-base bg-background">
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
        <div className="mt-2 flex items-center justify-between gap-2">
          {PAYMENT_METHODS.map((m) => {
            const Icon = METHOD_ICONS[m]
            return (
              <div key={m} className="flex flex-col items-start gap-0.5 min-w-0">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-muted">
                  <Icon size={10} />
                  {METHOD_LABELS[m]}
                </span>
                <span className="text-[14px] font-bold text-foreground tabular-nums">
                  {formatInr(byMethod[m])}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

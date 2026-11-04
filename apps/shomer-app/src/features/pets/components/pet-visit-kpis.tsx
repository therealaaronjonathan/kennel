import { formatInr } from '@/lib/utils'
import type { PetHistoryKpis } from '../services/use-pet-visit-history'

export function PetVisitKpis({ kpis }: { kpis: PetHistoryKpis }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Kpi label="Total visits" value={String(kpis.totalVisits)} />
      <Kpi label="Total paid" value={formatInr(kpis.totalPaid)} />
      <Kpi
        label="Outstanding"
        value={formatInr(kpis.outstanding)}
        warning={kpis.outstanding > 0}
      />
    </div>
  )
}

function Kpi({
  label,
  value,
  warning,
}: {
  label: string
  value: string
  warning?: boolean
}) {
  return (
    <div className="rounded-[4px] border border-border-base bg-surface px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p
        className={`mt-1 text-[15px] font-bold tabular-nums leading-none ${
          warning ? 'text-warning' : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

import { useState } from 'react'
import { X } from 'lucide-react'
import type { ClinicService } from '../services/use-clinic-services'

export interface ServiceEntry {
  serviceId: string
  name: string
  price: number
}

interface ServicesSelectProps {
  selected: ServiceEntry[]
  onChange: (selected: ServiceEntry[]) => void
  items: ClinicService[]
  loading: boolean
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

export function ServicesSelect({ selected, onChange, items, loading }: ServicesSelectProps) {
  const [filter, setFilter] = useState('')

  const selectedIds = new Set(selected.map((s) => s.serviceId))

  const filtered = items.filter(
    (s) =>
      !selectedIds.has(s.id) && s.name.toLowerCase().includes(filter.toLowerCase()),
  )

  const total = selected.reduce((sum, s) => sum + s.price, 0)

  function selectItem(item: ClinicService) {
    onChange([...selected, { serviceId: item.id, name: item.name, price: item.price }])
    setFilter('')
  }

  function remove(serviceId: string) {
    onChange(selected.filter((s) => s.serviceId !== serviceId))
  }

  return (
    <div className="space-y-2">
      {/* Itemized selected services */}
      {selected.length > 0 && (
        <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
          {selected.map((entry) => (
            <div
              key={entry.serviceId}
              className="flex items-center justify-between px-3 py-2 bg-surface"
            >
              <span className="text-[13px] text-foreground">{entry.name}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[13px] font-semibold text-foreground">
                  {formatInr(entry.price)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(entry.serviceId)}
                  className="text-muted hover:text-danger transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
          {/* Total row */}
          <div className="flex items-center justify-between px-3 py-2 bg-surface-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              Total
            </span>
            <span className="text-[14px] font-bold text-primary">{formatInr(total)}</span>
          </div>
        </div>
      )}

      {/* Search input */}
      <input
        type="text"
        placeholder={loading ? 'Loading services…' : 'Search services…'}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        disabled={loading}
        className="w-full rounded-[4px] border border-border-base bg-surface px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
      />

      {/* Dropdown */}
      {filter.trim() && (
        <div className="max-h-44 overflow-y-auto rounded-[4px] border border-border-base bg-surface">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-muted text-center">
              No matches for "{filter}"
            </p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(item)}
                className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-2 transition-colors"
              >
                <span className="text-[13px] text-foreground">{item.name}</span>
                <span className="text-[12px] text-muted">{formatInr(item.price)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

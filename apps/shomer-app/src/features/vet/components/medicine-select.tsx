import { useState } from 'react'
import { X } from 'lucide-react'
import type { ClinicMedicine } from '../services/use-clinic-medicines'

export interface PrescriptionEntry {
  medicineId: string | null
  name: string
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  days: number
  isCustom: boolean
}

interface MedicineSelectProps {
  selected: PrescriptionEntry[]
  onChange: (selected: PrescriptionEntry[]) => void
  items: ClinicMedicine[]
  loading: boolean
}

const TIMINGS = [
  { key: 'morning' as const, label: 'Morning' },
  { key: 'afternoon' as const, label: 'Afternoon' },
  { key: 'evening' as const, label: 'Evening' },
  { key: 'night' as const, label: 'Night' },
]

export function MedicineSelect({ selected, onChange, items, loading }: MedicineSelectProps) {
  const [filter, setFilter] = useState('')

  const selectedNames = new Set(selected.map((s) => s.name.toLowerCase()))

  const filtered = items.filter(
    (m) =>
      !selectedNames.has(m.name.toLowerCase()) &&
      m.name.toLowerCase().includes(filter.toLowerCase()),
  )

  function selectItem(item: ClinicMedicine) {
    onChange([
      ...selected,
      {
        medicineId: item.id,
        name: item.name,
        morning: false,
        afternoon: false,
        evening: false,
        night: false,
        days: 1,
        isCustom: false,
      },
    ])
    setFilter('')
  }

  function updateEntry(index: number, updates: Partial<PrescriptionEntry>) {
    const next = [...selected]
    next[index] = { ...next[index], ...updates }
    onChange(next)
  }

  function remove(index: number) {
    onChange(selected.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {/* Selected medicines */}
      {selected.map((entry, i) => (
        <div key={i} className="rounded-[4px] border border-border-base bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-base">
            <span className="text-[12px] font-semibold text-foreground">{entry.name}</span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-muted hover:text-danger transition-colors ml-2"
            >
              <X size={12} />
            </button>
          </div>
          <div className="px-3 py-2.5 space-y-2.5">
            {/* Timing checkboxes */}
            <div className="flex gap-4 flex-wrap">
              {TIMINGS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entry[key]}
                    onChange={(e) => updateEntry(i, { [key]: e.target.checked })}
                    className="accent-primary h-3.5 w-3.5 flex-shrink-0"
                  />
                  <span className="text-[12px] text-foreground">{label}</span>
                </label>
              ))}
            </div>
            {/* Duration */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-muted">Duration</span>
              <input
                type="number"
                min={1}
                max={365}
                value={entry.days === 0 ? '' : entry.days}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  updateEntry(i, { days: isNaN(val) ? 0 : Math.min(val, 365) })
                }}
                onBlur={() => {
                  if (!entry.days || entry.days < 1) updateEntry(i, { days: 1 })
                }}
                className="w-16 rounded-[3px] border border-border-base bg-surface-2 px-2 py-1 text-[12px] text-foreground text-center focus:border-primary focus:outline-none"
              />
              <span className="text-[12px] text-muted">days</span>
            </div>
          </div>
        </div>
      ))}

      {/* Search input */}
      <input
        type="text"
        placeholder={loading ? 'Loading medicines…' : 'Search medicines…'}
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
                className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-surface-2 transition-colors"
              >
                {item.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

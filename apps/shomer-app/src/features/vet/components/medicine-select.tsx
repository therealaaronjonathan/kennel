import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClinicMedicine, MedicineType } from '../services/use-clinic-medicines'

export interface PrescriptionEntry {
  medicineId: string | null
  name: string
  type: MedicineType
  quantity: string
  morning: boolean
  afternoon: boolean
  evening: boolean
  night: boolean
  days: number
  isCustom: boolean
}

export interface MedicineEntryErrors {
  noTiming?: boolean
  badQty?: boolean
  badDays?: boolean
}

export function entryErrors(entry: PrescriptionEntry): MedicineEntryErrors {
  const noTiming = !entry.morning && !entry.afternoon && !entry.evening && !entry.night
  const qtyNum = parseFloat(entry.quantity)
  const badQty = !entry.quantity || Number.isNaN(qtyNum) || qtyNum <= 0
  const badDays = !entry.days || entry.days < 1
  return { noTiming, badQty, badDays }
}

export function entryHasError(entry: PrescriptionEntry): boolean {
  const e = entryErrors(entry)
  return !!(e.noTiming || e.badQty || e.badDays)
}

export const MEDICINE_ENTRY_DOM_ID = (i: number) => `medicine-entry-${i}`

const TABLET_OPTIONS = [
  { value: '1', label: 'Full' },
  { value: '1/2', label: 'Half' },
  { value: '1/3', label: '1/3' },
  { value: '1/4', label: '1/4' },
]

const SYRUP_ML_OPTIONS = [2.5, 5, 7.5, 10, 15, 20, 25, 30]

function defaultQuantity(type: MedicineType): string {
  if (type === 'tablet') return '1'
  if (type === 'syrup') return '5'
  return '1'
}

interface MedicineSelectProps {
  selected: PrescriptionEntry[]
  onChange: (selected: PrescriptionEntry[]) => void
  items: ClinicMedicine[]
  loading: boolean
  /** When true, invalid entries render with error styling and helper text. */
  showErrors?: boolean
}

const TIMINGS = [
  { key: 'morning' as const, label: 'Morning' },
  { key: 'afternoon' as const, label: 'Afternoon' },
  { key: 'evening' as const, label: 'Evening' },
  { key: 'night' as const, label: 'Night' },
]

export function MedicineSelect({ selected, onChange, items, loading, showErrors = false }: MedicineSelectProps) {
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
        type: item.type,
        quantity: defaultQuantity(item.type),
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
      {selected.map((entry, i) => {
        const errs = showErrors ? entryErrors(entry) : {}
        const cardHasError = !!(errs.noTiming || errs.badQty || errs.badDays)

        return (
        <div
          key={i}
          id={MEDICINE_ENTRY_DOM_ID(i)}
          className={cn(
            'rounded-[4px] border bg-surface overflow-hidden transition-colors',
            cardHasError ? 'border-danger' : 'border-border-base',
          )}
        >

          {/* Header: name + type badge + remove */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-base">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-semibold text-foreground truncate">{entry.name}</span>
              <span className="flex-shrink-0 rounded-[3px] bg-surface-2 border border-border-base px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted">
                {entry.type}
              </span>
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="flex-shrink-0 ml-2 text-muted hover:text-danger transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          {/* Timing — full-width toggle buttons */}
          <div
            className={cn(
              'grid grid-cols-4 border-b',
              errs.noTiming ? 'border-danger/40 bg-danger/5' : 'border-border-base',
            )}
          >
            {TIMINGS.map(({ key, label }, idx) => (
              <button
                key={key}
                type="button"
                onClick={() => updateEntry(i, { [key]: !entry[key] })}
                className={cn(
                  'py-2 text-[12px] font-semibold transition-colors',
                  idx < 3 && 'border-r border-border-base',
                  entry[key]
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted hover:bg-surface-2 hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {errs.noTiming && (
            <p className="px-3 py-1.5 text-[11px] font-semibold text-danger bg-danger/5 border-b border-border-base">
              Pick at least one timing.
            </p>
          )}

          {/* Quantity + Duration — side by side */}
          <div className="grid grid-cols-2 divide-x divide-border-base">
            {/* Quantity */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="text-[11px] font-medium text-muted flex-shrink-0">Qty</span>
              {entry.type === 'tablet' ? (
                <select
                  value={entry.quantity}
                  onChange={(e) => updateEntry(i, { quantity: e.target.value })}
                  className={cn(
                    'flex-1 min-w-0 rounded-[3px] border bg-surface-2 px-2 py-1 text-[12px] text-foreground focus:outline-none',
                    errs.badQty ? 'border-danger focus:border-danger' : 'border-border-base focus:border-primary',
                  )}
                >
                  {TABLET_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : entry.type === 'syrup' ? (
                <select
                  value={entry.quantity}
                  onChange={(e) => updateEntry(i, { quantity: e.target.value })}
                  className={cn(
                    'flex-1 min-w-0 rounded-[3px] border bg-surface-2 px-2 py-1 text-[12px] text-foreground focus:outline-none',
                    errs.badQty ? 'border-danger focus:border-danger' : 'border-border-base focus:border-primary',
                  )}
                >
                  {SYRUP_ML_OPTIONS.map((ml) => (
                    <option key={ml} value={String(ml)}>{ml} ml</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={entry.quantity}
                    onChange={(e) => updateEntry(i, { quantity: e.target.value })}
                    className={cn(
                      'w-14 rounded-[3px] border bg-surface-2 px-2 py-1 text-[12px] text-foreground text-center focus:outline-none',
                      errs.badQty ? 'border-danger focus:border-danger' : 'border-border-base focus:border-primary',
                    )}
                  />
                  <span className="text-[11px] text-muted">ml</span>
                </div>
              )}
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2 px-3 py-2.5">
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
                className={cn(
                  'w-14 rounded-[3px] border bg-surface-2 px-2 py-1 text-[12px] text-foreground text-center focus:outline-none',
                  errs.badDays ? 'border-danger focus:border-danger' : 'border-border-base focus:border-primary',
                )}
              />
              <span className="text-[11px] font-medium text-muted">days</span>
            </div>
          </div>

          {(errs.badQty || errs.badDays) && (
            <p className="px-3 py-1.5 text-[11px] font-semibold text-danger bg-danger/5 border-t border-border-base">
              {errs.badQty && errs.badDays
                ? 'Enter a valid quantity and number of days.'
                : errs.badQty
                  ? 'Enter a valid quantity.'
                  : 'Enter a valid number of days.'}
            </p>
          )}

        </div>
        )
      })}

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

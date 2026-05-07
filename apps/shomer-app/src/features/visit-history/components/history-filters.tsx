import { useEffect, useRef, useState } from 'react'
import { Calendar, Search, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '@/features/checkout/services/complete-billing'
import type { ClinicService } from '@/features/vet/services/use-clinic-services'

export type PaymentFilter = 'all' | 'partial' | PaymentMethod | 'split'

interface HistoryFiltersProps {
  fromDate: string
  toDate: string
  search: string
  selectedServiceIds: string[]
  paymentFilter: PaymentFilter
  services: ClinicService[]
  servicesLoading: boolean
  onChangeFromDate: (v: string) => void
  onChangeToDate: (v: string) => void
  onChangeSearch: (v: string) => void
  onChangeSelectedServiceIds: (ids: string[]) => void
  onChangePaymentFilter: (v: PaymentFilter) => void
  onApplyPreset: (preset: 'today' | 'last7') => void
}

const labelClass =
  'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'

const inputClass =
  'h-8 rounded-[4px] border border-border-base bg-background px-2 text-[12px] font-semibold text-foreground focus:outline-none focus:border-primary'

export function HistoryFilters({
  fromDate,
  toDate,
  search,
  selectedServiceIds,
  paymentFilter,
  services,
  servicesLoading,
  onChangeFromDate,
  onChangeToDate,
  onChangeSearch,
  onChangeSelectedServiceIds,
  onChangePaymentFilter,
  onApplyPreset,
}: HistoryFiltersProps) {
  return (
    <div className="border-b border-border-base bg-surface px-6 py-3 space-y-2.5">
      {/* Row 1: dates + presets */}
      <div className="flex items-center gap-3 flex-wrap">
        <Calendar size={14} className="text-muted" />
        <label className="flex items-center gap-1.5">
          <span className={labelClass}>From</span>
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => onChangeFromDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <span className="text-muted text-[12px]">→</span>
        <label className="flex items-center gap-1.5">
          <span className={labelClass}>To</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => onChangeToDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="flex items-center gap-1.5 ml-1">
          <button
            type="button"
            onClick={() => onApplyPreset('today')}
            className="h-8 rounded-[4px] border border-border-base bg-background px-3 text-[11px] font-semibold text-muted hover:border-primary hover:text-primary transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onApplyPreset('last7')}
            className="h-8 rounded-[4px] border border-border-base bg-background px-3 text-[11px] font-semibold text-muted hover:border-primary hover:text-primary transition-colors"
          >
            Last 7 days
          </button>
        </div>
      </div>

      {/* Row 2: search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-[320px]">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            placeholder="Search pet, owner, token..."
            value={search}
            onChange={(e) => onChangeSearch(e.target.value)}
            className={cn(inputClass, 'w-full pl-7 pr-7')}
          />
          {search && (
            <button
              type="button"
              onClick={() => onChangeSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <ServiceMultiSelect
          services={services}
          loading={servicesLoading}
          selectedIds={selectedServiceIds}
          onChange={onChangeSelectedServiceIds}
        />

        <label className="flex items-center gap-1.5">
          <span className={labelClass}>Payment</span>
          <select
            value={paymentFilter}
            onChange={(e) => onChangePaymentFilter(e.target.value as PaymentFilter)}
            className={inputClass}
          >
            <option value="all">All</option>
            <option value="cash">{PAYMENT_METHOD_LABELS.cash}</option>
            <option value="card">{PAYMENT_METHOD_LABELS.card}</option>
            <option value="upi">{PAYMENT_METHOD_LABELS.upi}</option>
            <option value="split">Split</option>
            <option value="partial">Partial</option>
          </select>
        </label>
      </div>
    </div>
  )
}

// ── Service multi-select ─────────────────────────────────────────────────────

interface ServiceMultiSelectProps {
  services: ClinicService[]
  loading: boolean
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

function ServiceMultiSelect({
  services,
  loading,
  selectedIds,
  onChange,
}: ServiceMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  )

  const triggerLabel =
    selectedIds.length === 0
      ? 'All services'
      : selectedIds.length === 1
        ? services.find((s) => s.id === selectedIds[0])?.name ?? '1 selected'
        : `${selectedIds.length} selected`

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div ref={ref} className="relative">
      <label className="flex items-center gap-1.5">
        <span className={labelClass}>Service</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={loading}
          className={cn(
            inputClass,
            'flex items-center gap-1.5 min-w-[150px] justify-between',
          )}
        >
          <span className="truncate max-w-[140px] text-left">{triggerLabel}</span>
          <ChevronDown size={12} className="text-muted flex-shrink-0" />
        </button>
      </label>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-[260px] max-h-[320px] flex flex-col rounded-[4px] border border-border-base bg-surface shadow-lg">
          <div className="border-b border-border-base p-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(inputClass, 'w-full')}
              autoFocus
            />
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] font-semibold text-primary hover:opacity-85 whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-muted">No services found.</p>
            ) : (
              filtered.map((s) => {
                const checked = selectedIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors',
                      checked
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-surface-2 text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'h-3.5 w-3.5 rounded-[3px] border flex items-center justify-center flex-shrink-0',
                        checked
                          ? 'border-primary bg-primary text-white'
                          : 'border-border-base bg-background',
                      )}
                    >
                      {checked && <span className="text-[9px] font-bold">✓</span>}
                    </span>
                    <span className="truncate flex-1">{s.name}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

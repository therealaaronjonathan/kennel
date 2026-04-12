import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatInr } from '@/lib/utils'

export interface CatalogService {
  id: string
  name: string
  price: number
  serviceType?: string
}

export interface ServiceEntry {
  serviceId: string
  name: string
  price: number
  quantity: number
}

interface ServicesSelectProps {
  selected: ServiceEntry[]
  onChange: (selected: ServiceEntry[]) => void
  items: CatalogService[]
  loading: boolean
}

// ── Grouping ──────────────────────────────────────────────────────────────────

function groupByType(items: CatalogService[]): [string, CatalogService[]][] {
  const map = new Map<string, CatalogService[]>()
  for (const item of items) {
    const key = item.serviceType?.trim() || 'General'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  // Sort alphabetically; Grooming pinned second-to-last, General pinned last
  function typeOrder(t: string) {
    if (t === 'General') return 2
    if (t.toLowerCase() === 'grooming') return 1
    return 0
  }
  const entries = [...map.entries()].sort(([a], [b]) => {
    const diff = typeOrder(a) - typeOrder(b)
    if (diff !== 0) return diff
    return a.localeCompare(b)
  })
  return entries
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ServicesSelect({ selected, onChange, items, loading }: ServicesSelectProps) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [globalOpen, setGlobalOpen] = useState(false)
  const [openType, setOpenType] = useState<string | null>(null)
  const [typeFilters, setTypeFilters] = useState<Record<string, string>>({})

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.serviceId)), [selected])
  const grouped = useMemo(() => groupByType(items), [items])

  const total = selected.reduce((sum, s) => sum + s.quantity * s.price, 0)

  function addService(item: CatalogService) {
    if (selectedIds.has(item.id)) return
    onChange([...selected, { serviceId: item.id, name: item.name, price: item.price, quantity: 1 }])
  }

  function removeService(serviceId: string) {
    onChange(selected.filter((s) => s.serviceId !== serviceId))
  }

  function updatePrice(serviceId: string, newPrice: number) {
    onChange(selected.map((s) => s.serviceId === serviceId ? { ...s, price: newPrice } : s))
  }

  function updateQuantity(serviceId: string, newQty: number) {
    onChange(selected.map((s) => s.serviceId === serviceId ? { ...s, quantity: Math.max(1, newQty) } : s))
  }

  function toggleType(type: string, buttonEl: HTMLElement) {
    const isOpening = openType !== type
    setOpenType(isOpening ? type : null)
    if (isOpening) {
      // After React renders the opened section, scroll it into view
      setTimeout(() => {
        buttonEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }

  // Global search: flat list of all unselected items matching filter
  const globalResults = useMemo(() => {
    const q = globalFilter.trim().toLowerCase()
    if (!q) return []
    return items.filter(
      (s) => !selectedIds.has(s.id) && s.name.toLowerCase().includes(q),
    )
  }, [globalFilter, items, selectedIds])

  const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted'
  const inputClass =
    'w-full rounded-[4px] border border-border-base bg-surface px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors disabled:opacity-50'

  return (
    <div className="space-y-2">
      {/* ── Selected services table ─────────────────────────────────────── */}
      {selected.length > 0 && (
        <div className="rounded-[4px] border border-border-base overflow-hidden divide-y divide-border-base">
          {selected.map((entry) => (
            <div
              key={entry.serviceId}
              className="flex items-center gap-2 px-3 py-2 bg-surface"
            >
              <span className="flex-1 text-[13px] text-foreground truncate">{entry.name}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Quantity */}
                <input
                  type="number"
                  min="1"
                  max="999"
                  step="1"
                  value={entry.quantity}
                  onChange={(e) => updateQuantity(entry.serviceId, Number(e.target.value) || 1)}
                  className="w-[44px] rounded-[3px] border border-border-base bg-background px-2 py-0.5 text-[13px] font-semibold text-foreground text-right focus:border-primary focus:outline-none transition-colors tabular-nums"
                />
                <span className="text-[11px] text-muted">×</span>
                {/* Unit price */}
                <span className="text-[11px] text-muted">₹</span>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  step="1"
                  value={entry.price}
                  onChange={(e) => updatePrice(entry.serviceId, Number(e.target.value) || 0)}
                  className="w-[72px] rounded-[3px] border border-border-base bg-background px-2 py-0.5 text-[13px] font-semibold text-foreground text-right focus:border-primary focus:outline-none transition-colors tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => removeService(entry.serviceId)}
                  className="text-muted hover:text-danger transition-colors ml-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
          {/* Total row */}
          <div className="flex items-center justify-between px-3 py-2 bg-surface-2">
            <span className={labelClass}>Total</span>
            <span className="text-[14px] font-bold text-primary tabular-nums">{formatInr(total)}</span>
          </div>
        </div>
      )}

      {/* ── Global search ───────────────────────────────────────────────── */}
      <div className="relative">
        <input
          type="text"
          placeholder={loading ? 'Loading services…' : 'Search all services…'}
          value={globalFilter}
          disabled={loading}
          onChange={(e) => {
            setGlobalFilter(e.target.value)
            setGlobalOpen(true)
          }}
          onFocus={() => { if (globalFilter.trim()) setGlobalOpen(true) }}
          onBlur={() => setTimeout(() => setGlobalOpen(false), 150)}
          className={cn(inputClass)}
        />
        {globalOpen && globalFilter.trim() && (
          <div className="absolute z-10 left-0 right-0 top-full mt-0.5 max-h-44 overflow-y-auto rounded-[4px] border border-border-base bg-surface shadow-sm">
            {globalResults.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-muted text-center">
                No matches for "{globalFilter}"
              </p>
            ) : (
              globalResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={() => {
                    addService(item)
                    setGlobalFilter('')
                    setGlobalOpen(false)
                  }}
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

      {/* ── Type accordions ─────────────────────────────────────────────── */}
      {!loading && grouped.map(([type, typeItems]) => {
        const isOpen = openType === type
        const typeFilter = typeFilters[type] ?? ''
        const unselectedInType = typeItems.filter((s) => !selectedIds.has(s.id))
        const filteredInType = typeFilter.trim()
          ? unselectedInType.filter((s) => s.name.toLowerCase().includes(typeFilter.toLowerCase()))
          : unselectedInType

        return (
          <div key={type} className="rounded-[4px] border border-border-base overflow-hidden">
            <button
              type="button"
              onClick={(e) => toggleType(type, e.currentTarget)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={labelClass}>{type}</span>
                {unselectedInType.length > 0 && (
                  <span className="rounded-full bg-surface-2 border border-border-base px-1.5 py-0.5 text-[10px] font-bold text-muted tabular-nums">
                    {unselectedInType.length}
                  </span>
                )}
              </div>
              {isOpen ? (
                <ChevronUp size={13} className="text-muted" />
              ) : (
                <ChevronDown size={13} className="text-muted" />
              )}
            </button>

            {isOpen && (
              <div className="bg-surface border-t border-border-base">
                {/* Per-type search */}
                {typeItems.length > 5 && (
                  <div className="px-3 pt-3 pb-1">
                    <input
                      type="text"
                      placeholder={`Search ${type}…`}
                      value={typeFilter}
                      onChange={(e) =>
                        setTypeFilters((prev) => ({ ...prev, [type]: e.target.value }))
                      }
                      className="w-full rounded-[3px] border border-border-base bg-background px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                )}

                {/* Item list */}
                <div className="max-h-52 overflow-y-auto">
                  {filteredInType.length === 0 ? (
                    <p className="px-4 py-3 text-[12px] text-muted text-center">
                      {unselectedInType.length === 0
                        ? 'All services in this category added'
                        : `No matches for "${typeFilter}"`}
                    </p>
                  ) : (
                    filteredInType.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addService(item)}
                        className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-surface-2 transition-colors border-t border-border-base first:border-t-0"
                      >
                        <span className="text-[13px] text-foreground">{item.name}</span>
                        <span className="text-[12px] text-muted flex-shrink-0">{formatInr(item.price)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClinicDiagnosis } from '../services/use-clinic-diagnoses'

export interface DiagnosisEntry {
  diagnosisId: string | null
  name: string
  notes: string
  isCustom: boolean
}

interface DiagnosisSelectProps {
  selected: DiagnosisEntry[]
  onChange: (selected: DiagnosisEntry[]) => void
  items: ClinicDiagnosis[]
  loading: boolean
}

const inputClass =
  'w-full rounded-[4px] border border-border-base bg-surface px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors disabled:opacity-50'

export function DiagnosisSelect({
  selected,
  onChange,
  items,
  loading,
}: DiagnosisSelectProps) {
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedNames = new Set(selected.map((s) => s.name.toLowerCase()))

  const filtered = items.filter(
    (d) =>
      !selectedNames.has(d.name.toLowerCase()) &&
      d.name.toLowerCase().includes(filter.toLowerCase()),
  )

  const trimmed = filter.trim()
  const exactMatch = items.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())
  const showAddOption =
    trimmed.length > 0 &&
    !exactMatch &&
    !selectedNames.has(trimmed.toLowerCase())

  const totalRows = filtered.length + (showAddOption ? 1 : 0)

  function selectItem(item: ClinicDiagnosis) {
    onChange([...selected, { diagnosisId: item.id, name: item.name, notes: '', isCustom: false }])
    setFilter('')
    setOpen(false)
    setHighlighted(-1)
    inputRef.current?.focus()
  }

  function addCustom() {
    if (!trimmed) return
    onChange([...selected, { diagnosisId: null, name: trimmed, notes: '', isCustom: true }])
    setFilter('')
    setOpen(false)
    setHighlighted(-1)
    inputRef.current?.focus()
  }

  function updateNotes(index: number, notes: string) {
    const next = [...selected]
    next[index] = { ...next[index], notes }
    onChange(next)
  }

  function remove(index: number) {
    onChange(selected.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, totalRows - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted >= 0 && highlighted < filtered.length) {
        selectItem(filtered[highlighted])
      } else if (highlighted === filtered.length && showAddOption) {
        addCustom()
      } else if (trimmed) {
        if (exactMatch) {
          const match = items.find((d) => d.name.toLowerCase() === trimmed.toLowerCase())
          if (match && !selectedNames.has(match.name.toLowerCase())) selectItem(match)
        } else {
          addCustom()
        }
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlighted(-1)
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const item = listRef.current.children[highlighted] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted])

  return (
    <div className="space-y-2">
      {/* Selected diagnoses with per-diagnosis notes */}
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
          <div className="px-3 py-2">
            <textarea
              rows={2}
              placeholder="Notes for this diagnosis (optional)…"
              value={entry.notes}
              onChange={(e) => updateNotes(i, e.target.value)}
              className={cn(
                'w-full rounded-[3px] border border-border-base bg-surface-2 px-2.5 py-1.5 text-[12px] text-foreground placeholder:text-muted/50 focus:border-primary focus:outline-none resize-none transition-colors',
              )}
            />
          </div>
        </div>
      ))}

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={loading ? 'Loading diagnoses…' : 'Search or type to add diagnosis…'}
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value)
            setOpen(true)
            setHighlighted(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => { setOpen(false); setHighlighted(-1) }, 150)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className={inputClass}
        />

        {open && totalRows > 0 && (
          <div
            ref={listRef}
            className="absolute z-20 left-0 right-0 top-full mt-0.5 max-h-44 overflow-y-auto rounded-[4px] border border-border-base bg-surface shadow-sm"
          >
            {filtered.length === 0 && !showAddOption && (
              <p className="px-3 py-3 text-[13px] text-muted text-center">No matches</p>
            )}
            {filtered.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={() => selectItem(item)}
                className={cn(
                  'w-full text-left px-3 py-2 text-[13px] transition-colors',
                  i === highlighted
                    ? 'bg-primary text-white'
                    : 'text-foreground hover:bg-surface-2',
                )}
              >
                {item.name}
              </button>
            ))}
            {showAddOption && (
              <button
                type="button"
                onMouseDown={addCustom}
                className={cn(
                  'w-full text-left px-3 py-2 text-[13px] font-medium transition-colors flex items-center gap-1.5',
                  highlighted === filtered.length
                    ? 'bg-primary text-white'
                    : 'text-primary hover:bg-surface-2',
                )}
              >
                <Plus size={12} className="flex-shrink-0" />
                Add "{trimmed}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

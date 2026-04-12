import { useState, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPLAINTS } from '../types'

interface ComplaintsInputProps {
  selected: string[]
  onChange: (selected: string[]) => void
}

export function ComplaintsSelect({ selected, onChange }: ComplaintsInputProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Complaints that match the query and haven't been selected yet
  const filtered = COMPLAINTS.filter(
    (c) =>
      !selected.includes(c) &&
      c.toLowerCase().includes(query.toLowerCase()),
  )

  // Show "Add" row only when there's typed text with no exact predefined match
  const trimmed = query.trim()
  const showAdd =
    trimmed.length > 0 &&
    !selected.includes(trimmed) &&
    !COMPLAINTS.some((c) => c.toLowerCase() === trimmed.toLowerCase())

  // Total navigable rows = filtered items + (1 if showAdd)
  const totalRows = filtered.length + (showAdd ? 1 : 0)

  function addComplaint(value: string) {
    const v = value.trim()
    if (!v) return
    if (selected.includes(v)) return
    onChange([...selected, v])
    setQuery('')
    setOpen(false)
    setHighlighted(-1)
    inputRef.current?.focus()
  }

  function removeComplaint(value: string) {
    onChange(selected.filter((s) => s !== value))
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
        addComplaint(filtered[highlighted])
      } else if (highlighted === filtered.length && showAdd) {
        addComplaint(trimmed)
      } else if (trimmed) {
        // Enter with no highlight — add custom if no exact match
        if (!COMPLAINTS.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
          addComplaint(trimmed)
        } else {
          // Exact match — add the predefined spelling
          const match = COMPLAINTS.find((c) => c.toLowerCase() === trimmed.toLowerCase())
          if (match && !selected.includes(match)) addComplaint(match)
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
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {selected.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-[3px] bg-primary/10 border border-primary/25 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-primary max-w-[220px]"
            >
              <span className="truncate">{tag}</span>
              <button
                type="button"
                onClick={() => removeComplaint(tag)}
                className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Typeahead input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a complaint…"
          value={query}
          maxLength={200}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlighted(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => { setOpen(false); setHighlighted(-1) }, 150)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
        />

        {open && totalRows > 0 && (
          <div
            ref={listRef}
            className="absolute z-20 mt-1 w-full rounded-[4px] border border-border-base bg-white shadow-sm max-h-[200px] overflow-y-auto"
          >
            {filtered.map((complaint, i) => (
              <button
                key={complaint}
                type="button"
                onMouseDown={() => addComplaint(complaint)}
                className={cn(
                  'w-full px-3 py-2 text-left text-[13px] font-medium transition-colors',
                  i === highlighted ? 'bg-primary text-white' : 'text-foreground hover:bg-surface-2',
                )}
              >
                {complaint}
              </button>
            ))}
            {showAdd && (
              <button
                type="button"
                onMouseDown={() => addComplaint(trimmed)}
                className={cn(
                  'w-full px-3 py-2 text-left text-[13px] font-medium transition-colors flex items-center gap-2',
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

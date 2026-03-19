import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreedSelectProps {
  value: string
  onChange: (v: string) => void
  breeds: string[]
  placeholder: string
  hasError?: boolean
}

export function BreedSelect({ value, onChange, breeds, placeholder, hasError }: BreedSelectProps) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep query in sync when parent clears the value (e.g. species change)
  useEffect(() => { setQuery(value) }, [value])

  const filtered = query
    ? breeds.filter((b) => b.toLowerCase().includes(query.toLowerCase()))
    : breeds

  function handleSelect(breed: string) {
    onChange(breed)
    setQuery(breed)
    setOpen(false)
    setHighlighted(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      handleSelect(filtered[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
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
    <div className="relative">
      <div
        className={cn(
          'flex items-center rounded-[4px] border bg-white transition-colors',
          hasError ? 'border-danger' : 'border-border-base focus-within:border-primary',
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange(e.target.value)
            setOpen(true)
            setHighlighted(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-0 px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault()
            setOpen((o) => !o)
            inputRef.current?.focus()
          }}
          className="mr-2.5 flex-shrink-0 border-0 bg-transparent text-muted transition-colors hover:text-foreground outline-none"
        >
          <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full rounded-[4px] border border-border-base bg-white shadow-sm max-h-[200px] overflow-y-auto"
        >
          {filtered.map((b, i) => (
            <button
              key={b}
              type="button"
              onMouseDown={() => handleSelect(b)}
              className={cn(
                'w-full px-3 py-2 text-left text-[13px] transition-colors',
                i === highlighted ? 'bg-primary text-white' : 'text-foreground hover:bg-surface-2',
              )}
            >
              {b}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

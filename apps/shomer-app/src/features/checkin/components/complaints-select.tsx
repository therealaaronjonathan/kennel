import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPLAINTS } from '../types'

interface ComplaintsSelectProps {
  selected: string[]
  onChange: (selected: string[]) => void
}

export function ComplaintsSelect({ selected, onChange }: ComplaintsSelectProps) {
  const [filter, setFilter] = useState('')
  const [otherText, setOtherText] = useState('')

  const filtered = COMPLAINTS.filter(
    (c) =>
      c !== 'Other' &&
      c.toLowerCase().includes(filter.toLowerCase()),
  )
  const showOther = 'other'.includes(filter.toLowerCase()) || filter === ''

  function toggle(complaint: string) {
    if (complaint === 'Other') {
      if (selected.includes('Other')) {
        onChange(selected.filter((s) => s !== 'Other'))
        setOtherText('')
      } else {
        onChange([...selected, 'Other'])
      }
      return
    }
    if (selected.includes(complaint)) {
      onChange(selected.filter((s) => s !== complaint))
    } else {
      onChange([...selected, complaint])
    }
  }

  function removeTag(tag: string) {
    if (tag === 'Other') setOtherText('')
    onChange(selected.filter((s) => s !== tag))
  }

  const hasOther = selected.includes('Other')

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {selected.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-[3px] bg-primary/10 border border-primary/25 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.05em] text-primary"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        type="text"
        placeholder="Search complaints…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
      />

      {/* Complaint list */}
      <div className="max-h-48 overflow-y-auto rounded-[4px] border border-border-base bg-white">
        {filtered.length === 0 && !showOther ? (
          <p className="px-3 py-3 text-[13px] text-muted text-center">
            No complaints match "{filter}"
          </p>
        ) : (
          <>
            {filtered.map((complaint) => {
              const isSelected = selected.includes(complaint)
              return (
                <label
                  key={complaint}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors hover:bg-surface',
                    isSelected && 'bg-surface-2',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(complaint)}
                    className="accent-primary h-3.5 w-3.5 flex-shrink-0"
                  />
                  <span className="text-[13px] font-medium text-foreground">
                    {complaint}
                  </span>
                </label>
              )
            })}
            {showOther && (
              <label
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors hover:bg-surface',
                  hasOther && 'bg-surface-2',
                )}
              >
                <input
                  type="checkbox"
                  checked={hasOther}
                  onChange={() => toggle('Other')}
                  className="accent-primary h-3.5 w-3.5 flex-shrink-0"
                />
                <span className="text-[13px] font-medium text-foreground">
                  Other
                </span>
              </label>
            )}
          </>
        )}
      </div>

      {/* Other free-text input */}
      {hasOther && (
        <input
          type="text"
          placeholder="Describe the complaint…"
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          className="w-full rounded-[4px] border border-border-base bg-white px-3 py-[9px] text-[13px] font-medium text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
        />
      )}
    </div>
  )
}

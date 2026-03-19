import { useState } from 'react'
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
  onSaveToClinic: (name: string) => Promise<void>
}

const inputClass =
  'w-full rounded-[4px] border border-border-base bg-surface px-3 py-[9px] text-[13px] text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none transition-colors disabled:opacity-50'

export function DiagnosisSelect({
  selected,
  onChange,
  items,
  loading,
  onSaveToClinic,
}: DiagnosisSelectProps) {
  const [filter, setFilter] = useState('')
  const [savePrompt, setSavePrompt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedNames = new Set(selected.map((s) => s.name.toLowerCase()))

  const filtered = items.filter(
    (d) =>
      !selectedNames.has(d.name.toLowerCase()) &&
      d.name.toLowerCase().includes(filter.toLowerCase()),
  )

  const exactMatch = items.some((d) => d.name.toLowerCase() === filter.trim().toLowerCase())
  const showAddOption =
    filter.trim().length > 0 &&
    !exactMatch &&
    !selectedNames.has(filter.trim().toLowerCase())

  function selectItem(item: ClinicDiagnosis) {
    onChange([...selected, { diagnosisId: item.id, name: item.name, notes: '', isCustom: false }])
    setFilter('')
  }

  function addCustom() {
    const name = filter.trim()
    if (!name) return
    onChange([...selected, { diagnosisId: null, name, notes: '', isCustom: true }])
    setSavePrompt(name)
    setFilter('')
  }

  function updateNotes(index: number, notes: string) {
    const next = [...selected]
    next[index] = { ...next[index], notes }
    onChange(next)
  }

  function remove(index: number) {
    onChange(selected.filter((_, i) => i !== index))
  }

  async function handleSaveToClinic() {
    if (!savePrompt) return
    setSaving(true)
    try {
      await onSaveToClinic(savePrompt)
    } finally {
      setSaving(false)
      setSavePrompt(null)
    }
  }

  return (
    <div className="space-y-2">
      {/* Save-to-clinic prompt */}
      {savePrompt && (
        <div className="rounded-[4px] border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-center justify-between gap-3">
          <p className="text-[12px] text-foreground leading-snug">
            Save <span className="font-semibold">"{savePrompt}"</span> to clinic's diagnosis list?
          </p>
          <div className="flex gap-2 flex-shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveToClinic}
              className="rounded-[3px] bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setSavePrompt(null)}
              className="rounded-[3px] border border-border-base px-2.5 py-1 text-[11px] font-semibold text-muted hover:text-foreground transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

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
      <input
        type="text"
        placeholder={loading ? 'Loading diagnoses…' : 'Search or type to add diagnosis…'}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        disabled={loading}
        className={inputClass}
      />

      {/* Dropdown */}
      {filter.trim() && (
        <div className="max-h-44 overflow-y-auto rounded-[4px] border border-border-base bg-surface">
          {filtered.length === 0 && !showAddOption && (
            <p className="px-3 py-3 text-[13px] text-muted text-center">No matches</p>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectItem(item)}
              className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-surface-2 transition-colors"
            >
              {item.name}
            </button>
          ))}
          {showAddOption && (
            <button
              type="button"
              onClick={addCustom}
              className="w-full text-left px-3 py-2 text-[13px] text-primary font-medium hover:bg-surface-2 transition-colors flex items-center gap-1.5"
            >
              <Plus size={12} />
              Add "{filter.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

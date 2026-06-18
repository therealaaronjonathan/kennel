import { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import { ErrorDetails } from '@/components/primitives/error-details'

interface EditNameDialogProps {
  open: boolean
  /** Dialog heading, e.g. "Edit pet name". */
  title: string
  /** Field label, e.g. "Pet name". */
  label: string
  initialValue: string
  loading: boolean
  error: string | null
  onCancel: () => void
  onConfirm: (value: string) => void
}

export function EditNameDialog({
  open,
  title,
  label,
  initialValue,
  loading,
  error,
  onCancel,
  onConfirm,
}: EditNameDialogProps) {
  const [value, setValue] = useState(initialValue)

  // Re-seed the field whenever the dialog (re)opens for a new target.
  useEffect(() => {
    if (open) setValue(initialValue)
  }, [open, initialValue])

  // Escape key to cancel.
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  const trimmed = value.trim()
  const unchanged = trimmed === initialValue.trim()
  const canSave = trimmed.length > 0 && !unchanged && !loading

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (canSave) onConfirm(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={() => !loading && onCancel()}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[4px] bg-surface border border-border-base shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border-base px-5 py-4">
          <Pencil size={14} className="text-muted flex-shrink-0" />
          <span className="text-[14px] font-bold text-foreground">{title}</span>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            {label}
          </label>
          <input
            type="text"
            autoFocus
            value={value}
            disabled={loading}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-[4px] border border-border-base bg-background px-3 py-2 text-[14px] text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
          />
          {error && <ErrorDetails message={error} className="mt-1" />}
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-border-base px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="flex-1 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

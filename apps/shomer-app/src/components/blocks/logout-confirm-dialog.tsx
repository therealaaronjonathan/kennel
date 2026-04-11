import { useState, useEffect } from 'react'
import { LogOut, AlertTriangle } from 'lucide-react'

interface LogoutConfirmDialogProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function LogoutConfirmDialog({ open, onCancel, onConfirm }: LogoutConfirmDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setLoading(false)
      setError(null)
    }
  }, [open])

  // Escape key to cancel
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
    } catch {
      setError('Sign out failed — check your connection.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[4px] bg-surface border border-border-base shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border-base px-5 py-4">
          <LogOut size={14} className="text-muted flex-shrink-0" />
          <span className="text-[14px] font-bold text-foreground">Sign out?</span>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-[13px] text-muted">You'll be returned to the login screen.</p>
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-[4px] border border-danger/30 bg-danger/5 px-3 py-2">
              <AlertTriangle size={12} className="text-danger flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-danger">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-border-base px-5 py-4">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-[4px] bg-danger px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  )
}

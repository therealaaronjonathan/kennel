import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Pencil } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ErrorDetails } from '@/components/primitives/error-details'
import { updateOwnerName, updateOwnerContact } from '@/features/checkin/services/edit-names'
import type { PetOwner } from '@/features/checkin/types'

export interface OwnerEditPatch {
  name: string
  email?: string
  altPhone?: string
}

interface EditOwnerDialogProps {
  open: boolean
  clinicId: string
  owner: PetOwner
  onCancel: () => void
  /** Called after a successful save with the new values, so stateful callers
   *  (e.g. the check-in "found" step) can update their local copy. */
  onSaved: (patch: OwnerEditPatch) => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Edit an owner's name, email, and alternate phone in one dialog. Name edits
 * cascade across history via updateOwnerName; email/altPhone patch the owner
 * doc via updateOwnerContact. The primary phone is shown read-only — it is the
 * owner's lookup identity.
 */
export function EditOwnerDialog({ open, clinicId, owner, onCancel, onSaved }: EditOwnerDialogProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(owner.name)
  const [email, setEmail] = useState(owner.email ?? '')
  const [altDigits, setAltDigits] = useState((owner.altPhone ?? '').replace('+91', ''))

  // Re-seed whenever the dialog (re)opens for a (possibly different) owner.
  useEffect(() => {
    if (open) {
      setName(owner.name)
      setEmail(owner.email ?? '')
      setAltDigits((owner.altPhone ?? '').replace('+91', ''))
    }
  }, [open, owner])

  const nameTrim = name.trim()
  const emailTrim = email.trim()
  const newAltPhone = altDigits.length === 10 ? '+91' + altDigits : null

  const nameChanged = nameTrim !== owner.name.trim()
  const emailChanged = emailTrim !== (owner.email ?? '')
  const altChanged = (newAltPhone ?? '') !== (owner.altPhone ?? '')
  const hasChanges = nameChanged || emailChanged || altChanged

  const emailValid = !emailTrim || EMAIL_RE.test(emailTrim)
  const altValid = altDigits.length === 0 || altDigits.length === 10
  const valid = nameTrim.length > 0 && emailValid && altValid

  const mutation = useMutation({
    mutationFn: async () => {
      if (nameChanged) await updateOwnerName(clinicId, owner.branchIds ?? [], owner.id, nameTrim)
      if (emailChanged || altChanged) {
        await updateOwnerContact(clinicId, owner.id, {
          ...(emailChanged ? { email: emailTrim || null } : {}),
          ...(altChanged ? { altPhone: newAltPhone } : {}),
        })
      }
    },
    onSuccess: () => {
      // Search-driven views re-read from these queries.
      queryClient.invalidateQueries({ queryKey: ['petSearch'] })
      queryClient.invalidateQueries({ queryKey: ['ownerByPhone'] })
      queryClient.invalidateQueries({ queryKey: ['petOwners'] })
      onSaved({ name: nameTrim, email: emailTrim || undefined, altPhone: newAltPhone ?? undefined })
    },
  })

  const loading = mutation.isPending

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

  const canSave = hasChanges && valid && !loading

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (canSave) mutation.mutate()
  }

  return createPortal(
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
          <span className="text-[14px] font-bold text-foreground">Edit owner details</span>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Owner name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              disabled={loading}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[4px] border border-border-base bg-background px-3 py-2 text-[14px] text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Primary phone — read-only (identity) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Phone <span className="font-normal normal-case">(can't be changed here)</span>
            </label>
            <input
              type="text"
              value={owner.phone}
              disabled
              readOnly
              className="w-full rounded-[4px] border border-border-base bg-surface-2 px-3 py-2 text-[14px] text-muted"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Email
            </label>
            <input
              type="text"
              value={email}
              disabled={loading}
              placeholder="owner@email.com"
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[4px] border border-border-base bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-50"
            />
            {!emailValid && <p className="text-[11px] text-danger">Enter a valid email address</p>}
          </div>

          {/* Alternate phone */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Alternate phone
            </label>
            <div className="flex items-center rounded-[4px] border border-border-base overflow-hidden">
              <span className="flex-shrink-0 select-none border-r border-border-base bg-surface-2 px-3 py-2 text-[14px] font-semibold text-muted">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={altDigits}
                disabled={loading}
                onChange={(e) => setAltDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="flex-1 bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50"
              />
            </div>
            {!altValid && <p className="text-[11px] text-danger">Enter the full 10-digit number</p>}
          </div>

          {mutation.isError && (
            <ErrorDetails
              message={(mutation.error as Error)?.message ?? 'Could not save. Try again.'}
              className="mt-1"
            />
          )}
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
    </div>,
    document.body,
  )
}

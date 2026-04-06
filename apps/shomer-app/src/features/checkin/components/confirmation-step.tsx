import { useState } from 'react'
import { Link2, Check, RotateCcw, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WhatsAppShareModal } from '@/components/blocks/whatsapp-share-modal'
import type { CheckinResult } from '../types'

interface ConfirmationStepProps {
  result: CheckinResult
  onNewCheckin: () => void
}

export function ConfirmationStep({ result, onNewCheckin }: ConfirmationStepProps) {
  const [copied, setCopied] = useState(false)
  const [showWAModal, setShowWAModal] = useState(false)
  const queueLink = `${window.location.origin}/queue/${result.doctorId}?token=${result.tokenDisplay}&clinicId=${result.clinicId}&branchId=${result.branchId}`

  function copyLink() {
    navigator.clipboard.writeText(queueLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const waMessage = `Hi ${result.ownerName}, ${result.petName} has been checked in!\n\nToken: ${result.tokenDisplay}\nDoctor: ${result.doctorName}\n\nTrack your position in queue:\n${queueLink}`

  return (
    <div className="space-y-6 text-center">
      {/* Token */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Token Number
        </p>
        <p className="font-display text-[52px] font-bold leading-none text-primary tracking-tight">
          {result.tokenDisplay}
        </p>
        {result.isEmergency && (
          <span className="inline-flex items-center rounded-[3px] bg-danger/15 border border-danger/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-danger">
            Emergency
          </span>
        )}
      </div>

      {/* Doctor */}
      <div className="rounded-[4px] border border-border-base bg-surface p-4 text-left space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Doctor
          </span>
          <span className="text-[13px] font-semibold text-foreground">
            {result.doctorName}
          </span>
        </div>

        <div className="flex justify-between items-start">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
            Complaints
          </span>
          <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
            {result.complaints.map((c) => (
              <span
                key={c}
                className="rounded-[3px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Queue link */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          Queue Link (share with owner)
        </p>
        {/* URL row — stacks vertically on mobile so the copy button stays accessible */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-[4px] border border-border-base bg-surface px-3 py-2">
          <span className="flex-1 text-left text-[12px] font-medium text-muted break-all">
            {queueLink}
          </span>
          <button
            type="button"
            onClick={copyLink}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-[11px] font-semibold transition-colors flex-shrink-0',
              copied
                ? 'border-success/40 bg-success/5 text-success'
                : 'border-border-base text-muted hover:text-foreground hover:border-foreground/20',
            )}
          >
            {copied ? <Check size={11} /> : <Link2 size={11} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* WhatsApp share */}
        <button
          type="button"
          disabled={!result.ownerPhone}
          onClick={() => setShowWAModal(true)}
          title={!result.ownerPhone ? 'No phone number on file' : undefined}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-[4px] border px-4 py-[9px] text-[13px] font-semibold transition-colors',
            result.ownerPhone
              ? 'border-border-base text-muted hover:text-foreground hover:border-foreground/20'
              : 'border-border-base text-muted opacity-40 cursor-not-allowed',
          )}
        >
          <MessageCircle size={13} />
          Share Queue Link via WhatsApp
        </button>
      </div>

      {/* New check-in */}
      <button
        type="button"
        onClick={onNewCheckin}
        className="flex items-center gap-2 mx-auto rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
      >
        <RotateCcw size={13} />
        New Check-in
      </button>

      {result.ownerPhone && (
        <WhatsAppShareModal
          open={showWAModal}
          onClose={() => setShowWAModal(false)}
          phone={result.ownerPhone}
          ownerName={result.ownerName}
          message={waMessage}
        />
      )}
    </div>
  )
}

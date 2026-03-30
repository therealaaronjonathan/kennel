import { MessageCircle, AlertTriangle, X } from 'lucide-react'

interface WhatsAppShareModalProps {
  open: boolean
  onClose: () => void
  phone: string     // raw phone string — sanitised internally
  ownerName: string
  message: string   // raw (unencoded) message text
}

export function WhatsAppShareModal({
  open,
  onClose,
  phone,
  ownerName,
  message,
}: WhatsAppShareModalProps) {
  if (!open) return null

  const sanitisedPhone = phone.replace(/\D/g, '')
  const shortPhone = sanitisedPhone.length < 11

  function handleOpen() {
    const url =
      'https://web.whatsapp.com/send?phone=' +
      sanitisedPhone +
      '&text=' +
      encodeURIComponent(message)
    window.open(url, '_blank')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[4px] bg-surface border border-border-base shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-base px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageCircle size={14} className="text-primary flex-shrink-0" />
            <span className="text-[14px] font-bold text-foreground">
              Send WhatsApp to {ownerName}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Phone */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              To
            </p>
            <p className="text-[13px] font-semibold text-foreground">+{sanitisedPhone}</p>
          </div>

          {/* Phone warning */}
          {shortPhone && (
            <div className="flex items-start gap-2 rounded-[4px] border border-warning/30 bg-warning/5 px-3 py-2">
              <AlertTriangle size={12} className="text-warning flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-warning">
                Phone may be missing country code — verify before sending
              </p>
            </div>
          )}

          {/* Message preview */}
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Message
            </p>
            <p className="text-[12px] text-muted leading-relaxed line-clamp-4 whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-border-base px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[4px] border border-border-base px-4 py-[9px] text-[13px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleOpen}
            className="flex-1 flex items-center justify-center gap-2 rounded-[4px] bg-primary px-4 py-[9px] text-[13px] font-semibold text-white hover:opacity-85 transition-opacity"
          >
            <MessageCircle size={13} />
            Open WhatsApp Web
          </button>
        </div>
      </div>
    </div>
  )
}

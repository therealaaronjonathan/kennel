import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function VisitDetailDrawer({
  open,
  onClose,
  children,
  widthClass = 'max-w-md',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  widthClass?: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/20"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 h-full w-full bg-background border-l border-border-base shadow-lg flex flex-col',
          widthClass,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 flex h-7 w-7 items-center justify-center rounded-[4px] text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <X size={14} />
        </button>
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
      </div>
    </div>
  )
}

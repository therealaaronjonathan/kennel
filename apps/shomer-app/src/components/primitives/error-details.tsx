import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorDetailsProps {
  message: string
  className?: string
}

export function ErrorDetails({ message, className }: ErrorDetailsProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('rounded-[4px] border border-danger/30 bg-danger/5', className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <AlertTriangle size={12} className="text-danger flex-shrink-0" />
        <span className="flex-1 text-[11px] font-semibold text-danger truncate">
          {expanded ? 'Error details' : message}
        </span>
        {expanded ? (
          <ChevronUp size={12} className="text-danger flex-shrink-0" />
        ) : (
          <ChevronDown size={12} className="text-danger flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-danger/20 px-3 pb-2">
          <div className="mt-2 max-h-32 overflow-y-auto rounded-[3px] bg-danger/10 px-2.5 py-2">
            <p className="text-[11px] text-danger break-all whitespace-pre-wrap leading-relaxed">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-danger/70 hover:text-danger transition-colors"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy error'}
          </button>
        </div>
      )}
    </div>
  )
}

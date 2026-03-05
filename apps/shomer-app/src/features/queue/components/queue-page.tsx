import { useParams, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useQueue } from '../services/use-queue'

function StatusDot({ status, isEmergency }: { status: string; isEmergency: boolean }) {
  if (isEmergency) {
    return <span className="h-1.5 w-1.5 rounded-full bg-danger flex-shrink-0" />
  }
  if (status === 'in-progress') {
    return <span className="h-1.5 w-1.5 rounded-full bg-warning flex-shrink-0" />
  }
  return <span className="h-1.5 w-1.5 rounded-full bg-muted flex-shrink-0" />
}

function StatusLabel({ status, isEmergency }: { status: string; isEmergency: boolean }) {
  if (isEmergency) return <span className="text-danger">Emergency</span>
  if (status === 'in-progress') return <span className="text-warning">In Progress</span>
  return <span className="text-muted">Waiting</span>
}

export function QueuePage() {
  const { doctorId } = useParams<{ doctorId: string }>()
  const [searchParams] = useSearchParams()
  const highlightToken = searchParams.get('token')

  const { entries, loading, error } = useQueue(doctorId ?? '')

  const doctorName = entries[0]?.doctorName ?? null

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[13px] text-muted">Loading queue…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[13px] text-danger">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center px-6">
        <div className="flex items-center gap-3">
          <img
            src="/logos/shomer-purple-on-light.png"
            alt="Shomer"
            className="h-6 w-auto"
          />
          <span className="text-[13px] text-muted">/</span>
          <span className="font-display text-[16px] font-bold text-foreground">
            {doctorName ? `${doctorName}'s Queue` : 'Queue'}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[11px] text-muted font-medium">Live</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-6">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <span className="text-3xl">🐾</span>
            <p className="text-[13px] font-semibold text-muted">
              No patients waiting right now
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 pb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Token
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Complaints
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Status
              </span>
            </div>

            {entries.map((entry, i) => {
              const isHighlighted = highlightToken && entry.tokenDisplay === highlightToken
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'grid grid-cols-[1fr_auto_auto] gap-4 items-center rounded-[4px] px-3 py-2.5 transition-colors',
                    isHighlighted
                      ? 'bg-surface-2 border border-border-active'
                      : i % 2 === 0
                      ? 'hover:bg-surface'
                      : 'hover:bg-surface',
                  )}
                >
                  {/* Token + position */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'text-[13px] font-bold',
                        isHighlighted
                          ? 'text-primary'
                          : entry.status === 'in-progress'
                          ? 'text-primary'
                          : 'text-muted',
                      )}
                    >
                      {entry.tokenDisplay}
                    </span>
                    {isHighlighted && (
                      <span className="rounded-[3px] bg-primary/10 border border-primary/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-primary">
                        You
                      </span>
                    )}
                    {entry.isEmergency && (
                      <span className="rounded-[3px] bg-danger/10 border border-danger/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-danger">
                        Emergency
                      </span>
                    )}
                  </div>

                  {/* Complaints */}
                  <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                    {entry.complaints.slice(0, 2).map((c) => (
                      <span
                        key={c}
                        className="rounded-[3px] bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted"
                      >
                        {c}
                      </span>
                    ))}
                    {entry.complaints.length > 2 && (
                      <span className="text-[10px] text-muted font-medium">
                        +{entry.complaints.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={entry.status} isEmergency={entry.isEmergency} />
                    <span className="text-[12px] font-medium">
                      <StatusLabel status={entry.status} isEmergency={entry.isEmergency} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-muted">
          Updates in real time · Please arrive 10 minutes before your turn
        </p>
      </main>
    </div>
  )
}

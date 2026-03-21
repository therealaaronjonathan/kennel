import { useParams, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useQueue } from '../services/use-queue'
import { useDoctor } from '../services/use-doctor'

function StatusDot({ status, isEmergency }: { status: string; isEmergency: boolean }) {
  if (isEmergency) return <span className="h-1.5 w-1.5 rounded-full bg-danger flex-shrink-0" />
  if (status === 'in-progress') return <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse flex-shrink-0" />
  return <span className="h-1.5 w-1.5 rounded-full bg-muted flex-shrink-0 opacity-40" />
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
  const clinicId = searchParams.get('clinicId') ?? ''
  const branchId = searchParams.get('branchId') ?? ''

  const { entries, loading, error } = useQueue(doctorId ?? '', clinicId, branchId)
  const doctor = useDoctor(clinicId, doctorId ?? '')

  const doctorName = doctor?.name ?? entries[0]?.doctorName ?? null

  // My entry — full status regardless of filtering
  const myEntry = highlightToken ? entries.find((e) => e.tokenDisplay === highlightToken) ?? null : null

  // Active queue: only waiting/in-progress, used for the list and position count
  const activeEntries = entries.filter((e) => e.status === 'waiting' || e.status === 'in-progress')

  // Position of this customer in the active queue (0-indexed = number of people ahead)
  const myActiveIndex = myEntry ? activeEntries.findIndex((e) => e.tokenDisplay === highlightToken) : -1
  const aheadCount = myActiveIndex >= 0 ? myActiveIndex : null

  // Queue list shown to customer: active entries excluding their own token
  const listEntries = activeEntries.filter((e) => e.tokenDisplay !== highlightToken)

  const isDone = myEntry?.status === 'completed' || myEntry?.status === 'billed'
  const isMyTurn = myEntry?.status === 'in-progress'

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

  // Consultation completed — show a standalone screen, no queue
  if (isDone) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-[52px] border-b border-border-base bg-surface flex items-center px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <img src="/logos/shomer-purple-on-light.png" alt="Shomer" className="h-6 w-auto" />
            <span className="text-[13px] text-muted">/</span>
            <span className="font-display text-[16px] font-bold text-foreground">
              {doctorName ? `${doctorName}'s Queue` : 'Queue'}
            </span>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 gap-5 text-center">
          <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-[22px] font-bold text-foreground font-display leading-tight">
              Consultation Complete
            </p>
            <p className="mt-2 text-[13px] text-muted max-w-[280px] leading-relaxed">
              {highlightToken && <span className="font-semibold text-foreground">{highlightToken} · </span>}
              Your visit is done. Please proceed to reception for checkout.
            </p>
          </div>
          {doctor && (
            <p className="text-[12px] text-muted">Thank you for visiting {doctorName}</p>
          )}
        </main>
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

      <main className="mx-auto max-w-lg px-6 py-6 space-y-6">

        {/* It's your turn — full-width prominent card */}
        {isMyTurn && (
          <div className="rounded-[4px] border-2 border-primary bg-primary/5 px-5 py-5 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Now Consulting</span>
            </div>
            <p className="font-display text-[32px] font-bold text-primary leading-none">{highlightToken}</p>
            <p className="text-[15px] font-bold text-foreground">It's your turn!</p>
            <p className="text-[13px] text-muted">
              Please proceed to {doctorName ? `Dr. ${doctorName}'s` : 'the'} consultation room now.
            </p>
          </div>
        )}

        {/* Waiting — position card */}
        {highlightToken && !isMyTurn && myEntry?.status === 'waiting' && aheadCount !== null && (
          <div className="rounded-[4px] border border-border-base bg-surface-2 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-1">
              Your token
            </p>
            <p className="font-display text-[28px] font-bold text-primary leading-none mb-3">
              {highlightToken}
            </p>
            <div className="h-px bg-border-base mb-3" />
            {aheadCount === 0 ? (
              <p className="text-[13px] font-semibold text-foreground">
                You're next — please be ready
              </p>
            ) : (
              <p className="text-[13px] font-semibold text-foreground">
                {aheadCount} {aheadCount === 1 ? 'patient' : 'patients'} ahead of you
              </p>
            )}
            {doctorName && (
              <p className="mt-1 text-[12px] text-muted">Consulting with {doctorName}</p>
            )}
          </div>
        )}

        {/* Doctor profile */}
        {doctor && (
          <div className="rounded-[4px] border border-border-base bg-surface px-5 py-4">
            <div className="flex items-start gap-4">
              {doctor.photoUrl ? (
                <img
                  src={doctor.photoUrl}
                  alt={doctor.name}
                  className="h-16 w-16 flex-shrink-0 rounded-[4px] object-cover object-top"
                />
              ) : (
                <div className="h-16 w-16 flex-shrink-0 rounded-[4px] bg-surface-2 flex items-center justify-center">
                  <span className="text-[22px] font-bold text-muted">
                    {doctor.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-foreground leading-tight">
                  {doctor.name}
                </p>
                {doctor.specialization && (
                  <p className="mt-0.5 text-[12px] font-semibold text-primary">
                    {doctor.specialization}
                  </p>
                )}
                {doctor.bio && (
                  <p className="mt-2 text-[12px] text-muted leading-relaxed">
                    {doctor.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Queue list — only waiting/in-progress, excluding customer's own token */}
        {listEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-[13px] font-semibold text-muted">No other patients waiting</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto] gap-4 px-3 pb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Token
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Status
              </span>
            </div>

            {listEntries.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  'grid grid-cols-[1fr_auto] gap-4 items-center rounded-[4px] px-3 py-2.5',
                  entry.status === 'in-progress' ? 'bg-warning/5' : '',
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'text-[13px] font-bold',
                      entry.status === 'in-progress' ? 'text-warning' : 'text-muted',
                    )}
                  >
                    {entry.tokenDisplay}
                  </span>
                  {entry.isEmergency && (
                    <span className="rounded-[3px] bg-danger/10 border border-danger/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-danger">
                      Emergency
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot status={entry.status} isEmergency={entry.isEmergency} />
                  <span className="text-[12px] font-medium">
                    <StatusLabel status={entry.status} isEmergency={entry.isEmergency} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-muted pb-4">
          Updates in real time · Please arrive 10 minutes before your turn
        </p>
      </main>
    </div>
  )
}

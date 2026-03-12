import { useParams, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useQueue } from '../services/use-queue'
import { useDoctor } from '../services/use-doctor'

function StatusDot({ status, isEmergency }: { status: string; isEmergency: boolean }) {
  if (isEmergency) return <span className="h-1.5 w-1.5 rounded-full bg-danger flex-shrink-0" />
  if (status === 'in-progress') return <span className="h-1.5 w-1.5 rounded-full bg-warning flex-shrink-0" />
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
  const clinicId = searchParams.get('clinicId') ?? ''
  const branchId = searchParams.get('branchId') ?? ''

  const { entries, loading, error } = useQueue(doctorId ?? '', clinicId, branchId)
  const doctor = useDoctor(clinicId, doctorId ?? '')

  const myPosition = highlightToken
    ? entries.findIndex((e) => e.tokenDisplay === highlightToken) + 1
    : null
  const aheadCount = myPosition !== null ? myPosition - 1 : null

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

  const doctorName = doctor?.name ?? entries[0]?.doctorName ?? null

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

        {/* Your token card */}
        {highlightToken && myPosition !== null && (
          <div className="rounded-[4px] border border-border-active bg-surface-2 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted mb-1">
              Your token
            </p>
            <p className="text-[28px] font-bold text-primary leading-none mb-3">
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

        {/* Queue list */}
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-[13px] font-semibold text-muted">No patients waiting right now</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto] gap-4 px-3 pb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Token
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Status
              </span>
            </div>

            {entries.map((entry) => {
              const isHighlighted = highlightToken && entry.tokenDisplay === highlightToken
              return (
                <div
                  key={entry.id}
                  className={cn(
                    'grid grid-cols-[1fr_auto] gap-4 items-center rounded-[4px] px-3 py-2.5 transition-colors',
                    isHighlighted
                      ? 'bg-surface-2 border border-border-active'
                      : 'hover:bg-surface',
                  )}
                >
                  {/* Token */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'text-[13px] font-bold',
                        isHighlighted || entry.status === 'in-progress'
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

        <p className="text-center text-[11px] text-muted">
          Updates in real time · Please arrive 10 minutes before your turn
        </p>
      </main>
    </div>
  )
}

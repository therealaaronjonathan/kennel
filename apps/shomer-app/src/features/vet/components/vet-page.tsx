import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import { LogoutConfirmDialog } from '@/components/blocks/logout-confirm-dialog'
import { SettingsPage } from '@/features/settings/components/settings-page'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/firebase'
import { useClinic } from '@/features/clinic'
import { useVetQueue, type VetQueueEntry } from '../services/use-vet-queue'
import { ConsultationView } from './consultation-view'

function StatusDot({ status, isEmergency }: { status: string; isEmergency: boolean }) {
  if (isEmergency) return <span className="h-1.5 w-1.5 rounded-full bg-danger flex-shrink-0" />
  if (status === 'in-progress') return <span className="h-1.5 w-1.5 rounded-full bg-warning flex-shrink-0" />
  return <span className="h-1.5 w-1.5 rounded-full bg-muted flex-shrink-0 opacity-40" />
}

function QueueRow({
  entry,
  isSelected,
  onClick,
}: {
  entry: VetQueueEntry
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border-base transition-colors',
        isSelected ? 'bg-surface-2 border-l-2 border-l-primary' : 'hover:bg-surface',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'text-[13px] font-bold',
                isSelected || entry.status === 'in-progress' ? 'text-primary' : 'text-foreground',
              )}
            >
              {entry.tokenDisplay}
            </span>
            {entry.isEmergency && (
              <span className="rounded-[3px] bg-danger/10 border border-danger/25 px-1 py-0.5 text-[9px] font-bold uppercase tracking-[0.04em] text-danger">
                ER
              </span>
            )}
          </div>
          <p className="text-[12px] font-semibold text-foreground truncate">{entry.petName}</p>
          <p className="text-[11px] text-muted truncate">{entry.ownerName}</p>
        </div>
        <StatusDot status={entry.status} isEmergency={entry.isEmergency} />
      </div>
    </button>
  )
}

export function VetPage() {
  const navigate = useNavigate()
  const { clinicId, branchId, branchName, branchIds, doctorId, loading: clinicLoading, error: clinicError, selectBranch } = useClinic()
  const { entries, loading: queueLoading, error: queueError } = useVetQueue(clinicId, branchId, doctorId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  async function handleSignOut() {
    await signOut(auth)
    navigate('/login', { replace: true })
  }
  const selectedEntry = entries.find((e) => e.id === selectedId) ?? null

  function handleCompleted() {
    setSelectedId(null)
  }

  if (clinicLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <p className="text-[13px] text-muted">Loading…</p>
      </div>
    )
  }

  if (clinicError || !clinicId || !branchId) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-[13px] text-danger font-medium">
            {clinicError ?? 'Clinic profile not found.'}
          </p>
          <p className="text-[11px] text-muted">Ask your admin to add you as staff in Firestore.</p>
        </div>
      </div>
    )
  }

  if (!doctorId) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-[13px] text-danger font-medium">Doctor profile not linked.</p>
          <p className="text-[11px] text-muted">
            Ask your admin to add a <code className="text-[11px] bg-surface-2 px-1 rounded">doctorId</code> to your
            staff record.
          </p>
        </div>
      </div>
    )
  }

  const waitingCount = entries.filter((e) => e.status === 'waiting').length
  const hasInProgress = entries.some((e) => e.status === 'in-progress')

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logos/shomer-full-icon.png"
            alt="Shomer"
            className="h-8 w-auto rounded-[4px]"
          />
          <span className="text-[13px] text-muted">/</span>
          <div className="flex items-center gap-1.5">
            <Stethoscope size={13} className="text-muted" />
            <span className="text-[13px] font-semibold text-foreground">Vet Console</span>
          </div>
          {branchName && (
            <>
              <span className="text-[13px] text-muted">·</span>
              {branchIds.length > 1 ? (
                <select
                  value={branchId ?? ''}
                  onChange={(e) => selectBranch(e.target.value)}
                  className="text-[12px] font-semibold text-primary bg-transparent border-none outline-none cursor-pointer"
                >
                  {branchIds.map((bid) => (
                    <option key={bid} value={bid}>{bid === branchId ? branchName : bid}</option>
                  ))}
                </select>
              ) : (
                <span className="text-[12px] font-semibold text-primary">{branchName}</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="rounded-[4px] border border-border-base px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setShowLogoutDialog(true)}
            className="rounded-[4px] border border-border-base px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Queue */}
        <aside className="w-[260px] border-r border-border-base bg-surface flex flex-col flex-shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-base flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Today's Queue</p>
            {!queueLoading && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">
                {waitingCount} waiting
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {queueLoading ? (
              <p className="px-4 py-6 text-[12px] text-muted">Loading…</p>
            ) : queueError ? (
              <p className="px-4 py-6 text-[12px] text-danger">{queueError}</p>
            ) : entries.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[12px] font-semibold text-muted">No patients waiting</p>
                <p className="mt-1 text-[11px] text-muted opacity-60">Queue updates in real time</p>
              </div>
            ) : (
              entries.map((entry) => (
                <QueueRow
                  key={entry.id}
                  entry={entry}
                  isSelected={selectedId === entry.id}
                  onClick={() => setSelectedId(entry.id)}
                />
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-border-base">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-muted font-medium">Live</span>
            </div>
          </div>
        </aside>

        {/* Right: Consultation */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {selectedEntry ? (
            <ConsultationView
              key={selectedEntry.id}
              entry={selectedEntry}
              clinicId={clinicId}
              branchId={branchId}
              hasInProgress={hasInProgress}
              onCompleted={handleCompleted}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <div className="h-10 w-10 rounded-[4px] bg-surface-2 flex items-center justify-center">
                <Stethoscope size={18} className="text-muted opacity-50" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-muted">Select a patient</p>
                <p className="mt-0.5 text-[11px] text-muted opacity-60">
                  Choose a token from the queue to start the consultation
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
          <SettingsPage onClose={() => setShowSettings(false)} />
        </div>
      )}

      <LogoutConfirmDialog
        open={showLogoutDialog}
        onCancel={() => setShowLogoutDialog(false)}
        onConfirm={handleSignOut}
      />
    </div>
  )
}

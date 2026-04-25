import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/firebase'
import { LogoutConfirmDialog } from '@/components/blocks/logout-confirm-dialog'
import { useClinic } from '@/features/clinic'
import { useCompletedVisits, type CompletedVisit } from '../services/use-completed-visits'
import { VisitDetailPanel } from './visit-detail-panel'
import type { Timestamp } from 'firebase/firestore'

function formatTime(ts: Timestamp | null): string {
  if (!ts) return '—'
  const d = ts.toDate()
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface ToastProps {
  message: string
  onDone: () => void
}

function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-[4px] bg-foreground px-4 py-3 shadow-lg">
      <CheckCircle size={14} className="text-success flex-shrink-0" />
      <span className="text-[13px] font-semibold text-background whitespace-nowrap">{message}</span>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { clinicId, branchId, loading: clinicLoading, error: clinicError } = useClinic()
  const { visits, loading: visitsLoading, error: visitsError } = useCompletedVisits(clinicId, branchId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  async function handleSignOut() {
    await signOut(auth)
    navigate('/login', { replace: true })
  }

  const selectedVisit: CompletedVisit | null = visits.find((v) => v.id === selectedId) ?? null

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

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/logos/shomer-purple-on-light.png"
            alt="Shomer"
            className="h-6 w-auto"
          />
          <span className="text-[13px] text-muted">/</span>
          <span className="text-[13px] font-semibold text-foreground">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/checkin')}
            className="rounded-[4px] bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-85 transition-opacity"
          >
            + Check-in
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
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
        {/* Left: visits list */}
        <div className="flex flex-col overflow-hidden border-r border-border-base"
          style={{ width: selectedVisit ? '55%' : '100%', transition: 'width 0.2s ease' }}
        >
          {/* Section header */}
          <div className="px-5 py-3 border-b border-border-base flex items-center justify-between flex-shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Completed Today
            </p>
            {!visitsLoading && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">
                {visits.length}
              </span>
            )}
          </div>

          {/* Table header */}
          {!visitsLoading && visits.length > 0 && (
            <div className="grid grid-cols-[80px_1fr_1fr_1fr_72px] gap-3 px-5 py-2 border-b border-border-base flex-shrink-0">
              {['Token', 'Pet', 'Owner', 'Doctor', 'Time'].map((h) => (
                <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* Rows */}
          <div className="flex-1 overflow-y-auto">
            {visitsLoading ? (
              <p className="px-5 py-8 text-[12px] text-muted">Loading…</p>
            ) : visitsError ? (
              <p className="px-5 py-8 text-[12px] text-danger">{visitsError}</p>
            ) : visits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <p className="text-[13px] font-semibold text-muted">No completed consultations yet today</p>
                <p className="text-[11px] text-muted opacity-60">Completed visits will appear here in real time</p>
              </div>
            ) : (
              visits.map((visit) => {
                const isSelected = selectedId === visit.id
                return (
                  <button
                    key={visit.id}
                    type="button"
                    onClick={() => setSelectedId(isSelected ? null : visit.id)}
                    className={cn(
                      'w-full grid grid-cols-[80px_1fr_1fr_1fr_72px] gap-3 px-5 py-3 text-left border-b border-border-base transition-colors',
                      isSelected ? 'bg-surface-2 border-l-2 border-l-primary' : 'hover:bg-surface',
                    )}
                  >
                    <span className="text-[12px] font-bold text-primary truncate">
                      {visit.tokenDisplay}
                    </span>
                    <span className="text-[12px] font-semibold text-foreground truncate">
                      {visit.petName}
                    </span>
                    <span className="text-[12px] text-muted truncate">{visit.ownerName}</span>
                    <span className="text-[12px] text-muted truncate">{visit.doctorName}</span>
                    <span className="text-[12px] text-muted tabular-nums">
                      {formatTime(visit.completedAt)}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right: detail panel */}
        {selectedVisit && (
          <div className="flex-1 overflow-hidden flex flex-col bg-background">
            <VisitDetailPanel
              key={selectedVisit.id}
              visit={selectedVisit}
              clinicId={clinicId}
              branchId={branchId}
              onToast={(msg) => setToast(msg)}
            />
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <LogoutConfirmDialog
        open={showLogoutDialog}
        onCancel={() => setShowLogoutDialog(false)}
        onConfirm={handleSignOut}
      />
    </div>
  )
}

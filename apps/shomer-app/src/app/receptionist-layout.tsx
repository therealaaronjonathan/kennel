import { useEffect, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import { LayoutDashboard, UserPlus, LayoutList, ReceiptText, Settings, LogOut, Stethoscope } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/features/auth'
import { useClinic } from '@/features/clinic'
import { useCompletedVisits } from '@/features/dashboard/services/use-completed-visits'
import { useAllVisits } from '@/features/reception/services/use-all-visits'

const NAV_ITEMS = [
  { to: '/reception/home', label: 'Home', Icon: LayoutDashboard },
  { to: '/reception/checkin', label: 'Check-in', Icon: UserPlus },
  { to: '/reception/queue', label: 'Queue', Icon: LayoutList },
  { to: '/reception/checkout', label: 'Check-out', Icon: ReceiptText, badge: true },
  { to: '/reception/settings', label: 'Settings', Icon: Settings },
]

function InProgressToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-[4px] border border-primary/30 bg-surface px-4 py-3 shadow-lg max-w-[300px]">
      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <Stethoscope size={14} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-primary mb-0.5">
          Call Patient
        </p>
        <p className="text-[13px] font-bold text-foreground leading-snug">{message}</p>
      </div>
    </div>
  )
}

export default function ReceptionistLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { clinicId, branchId } = useClinic()
  const { visits: unbilledVisits } = useCompletedVisits(clinicId, branchId)
  const { visits, loading } = useAllVisits(clinicId, branchId)
  const unbilledCount = unbilledVisits.length

  const [inProgressToast, setInProgressToast] = useState<string | null>(null)
  const seenInProgressIds = useRef(new Set<string>())
  const initialized = useRef(false)

  // Detect transitions to in-progress and fire toast.
  // Guard on clinicId too: useAllVisits returns loading=false immediately when
  // clinicId is null, which would seed an empty set before real data arrives.
  useEffect(() => {
    if (loading || !clinicId) return

    if (!initialized.current) {
      // Seed with current in-progress IDs so we don't toast on page load
      visits.filter((v) => v.status === 'in-progress').forEach((v) => seenInProgressIds.current.add(v.id))
      initialized.current = true
      return
    }

    for (const visit of visits) {
      if (visit.status === 'in-progress' && !seenInProgressIds.current.has(visit.id)) {
        seenInProgressIds.current.add(visit.id)
        setInProgressToast(`Call ${visit.tokenDisplay} — ${visit.petName} is ready`)
        break
      }
    }
  }, [visits, loading, clinicId])

  function handleSignOut() {
    signOut(auth).then(() => navigate('/login'))
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-surface border-r border-border-base flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border-base flex-shrink-0">
          <img
            src="/logos/shomer-full-icon.png"
            alt="Shomer"
            className="h-[44px] w-auto rounded-[6px]"
          />
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ to, label, Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-[9px] rounded-[4px] text-[13px] font-semibold transition-colors border',
                  isActive
                    ? 'bg-surface-2 border-border-active text-primary'
                    : 'border-transparent text-muted hover:bg-surface-2/60 hover:text-foreground',
                )
              }
            >
              <Icon size={15} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && unbilledCount > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white leading-none">
                  {unbilledCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user + sign out */}
        <div className="flex-shrink-0 border-t border-border-base px-4 py-4 space-y-3">
          {user?.email && (
            <p className="text-[11px] text-muted truncate" title={user.email}>
              {user.email}
            </p>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-[12px] font-semibold text-muted hover:text-foreground transition-colors"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <Outlet />
      </div>

      {/* In-progress notification */}
      {inProgressToast && (
        <InProgressToast message={inProgressToast} onDone={() => setInProgressToast(null)} />
      )}
    </div>
  )
}

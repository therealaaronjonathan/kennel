import { useEffect, useRef, useState } from 'react'
import { signOut } from 'firebase/auth'
import { LayoutDashboard, UserPlus, LayoutList, ReceiptText, Settings, LogOut, Stethoscope, CheckCircle, X } from 'lucide-react'
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

interface ToastItem {
  id: string
  type: 'in-progress' | 'completed'
  tokenDisplay: string
  petName: string
  doctorName: string
}

function NotificationToast({
  toast,
  index,
  onDone,
}: {
  toast: ToastItem
  index: number
  onDone: (id: string) => void
}) {
  useEffect(() => {
    const t = setTimeout(() => onDone(toast.id), 6000)
    return () => clearTimeout(t)
  }, [toast.id, onDone])

  const isInProgress = toast.type === 'in-progress'

  const borderColor = isInProgress ? 'border-l-primary' : 'border-l-[#22C55E]'
  const iconBg = isInProgress ? 'bg-primary' : 'bg-[#22C55E]'
  const titleColor = isInProgress ? 'text-primary' : 'text-[#22C55E]'
  const title = isInProgress ? 'Call Patient' : 'Consultation Complete'
  const body = isInProgress
    ? `${toast.tokenDisplay} — ${toast.petName} (${toast.doctorName})`
    : `${toast.tokenDisplay} — ${toast.petName} is done`
  const Icon = isInProgress ? Stethoscope : CheckCircle

  const topOffset = 16 + index * 80

  return (
    <div
      className={cn(
        'fixed right-4 z-50 flex items-start gap-3 rounded-[4px] border border-border-base border-l-4 bg-surface px-4 py-3 shadow-lg max-w-[300px] w-[300px] transition-all',
        borderColor,
      )}
      style={{ top: `${topOffset}px` }}
    >
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          iconBg,
        )}
      >
        <Icon size={14} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[10px] font-bold uppercase tracking-[0.08em] mb-0.5', titleColor)}>
          {title}
        </p>
        <p className="text-[13px] font-bold text-foreground leading-snug">{body}</p>
      </div>
      <button
        type="button"
        onClick={() => onDone(toast.id)}
        className="flex-shrink-0 text-muted hover:text-foreground transition-colors mt-0.5"
      >
        <X size={13} />
      </button>
    </div>
  )
}

function playNotificationSound() {
  try {
    new Audio('/sounds/notification.mp3').play()
  } catch {
    // Browser autoplay restrictions — acceptable
  }
}

export default function ReceptionistLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { clinicId, branchId, branchIds, branchName, selectBranch } = useClinic()
  const { visits: unbilledVisits } = useCompletedVisits(clinicId, branchId)
  const { visits, loading } = useAllVisits(clinicId, branchId)
  const unbilledCount = unbilledVisits.length

  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seenInProgressIds = useRef(new Set<string>())
  const seenCompletedIds = useRef(new Set<string>())
  const initialized = useRef(false)

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  function addToast(toast: Omit<ToastItem, 'id'>) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => {
      // Keep at most 3 visible at once; queue additional by appending (earlier ones dismiss)
      const next = [...prev, { id, ...toast }]
      return next.slice(-3)
    })
    playNotificationSound()
  }

  // Detect transitions to in-progress and completed, then fire the appropriate toast.
  // Guard on clinicId: useAllVisits returns loading=false immediately when clinicId is
  // null, which would seed an empty set before real data arrives.
  useEffect(() => {
    if (loading || !clinicId) return

    if (!initialized.current) {
      // Seed both seen-sets with current state so we don't toast on page load
      visits.forEach((v) => {
        if (v.status === 'in-progress') seenInProgressIds.current.add(v.id)
        if (v.status === 'completed') seenCompletedIds.current.add(v.id)
      })
      initialized.current = true
      return
    }

    for (const visit of visits) {
      if (visit.status === 'in-progress' && !seenInProgressIds.current.has(visit.id)) {
        seenInProgressIds.current.add(visit.id)
        addToast({
          type: 'in-progress',
          tokenDisplay: visit.tokenDisplay,
          petName: visit.petName,
          doctorName: visit.doctorName,
        })
      }

      if (visit.status === 'completed' && !seenCompletedIds.current.has(visit.id)) {
        seenCompletedIds.current.add(visit.id)
        addToast({
          type: 'completed',
          tokenDisplay: visit.tokenDisplay,
          petName: visit.petName,
          doctorName: visit.doctorName,
        })
      }
    }
  }, [visits, loading, clinicId])

  function handleSignOut() {
    signOut(auth).then(() => navigate('/login'))
  }

  // Show up to 3 toasts stacked from top-right
  const visibleToasts = toasts.slice(-3)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-surface border-r border-border-base flex flex-col">
        {/* Logo + branch */}
        <div className="px-4 py-4 border-b border-border-base flex-shrink-0">
          <img
            src="/logos/shomer-full-icon.png"
            alt="Shomer"
            className="h-[44px] w-auto rounded-[6px]"
          />
          {branchName && (
            <div className="mt-2">
              {branchIds.length > 1 ? (
                <select
                  value={branchId ?? ''}
                  onChange={(e) => selectBranch(e.target.value)}
                  className="w-full text-[11px] font-semibold text-primary bg-transparent border-none outline-none cursor-pointer truncate"
                >
                  {branchIds.map((bid) => (
                    <option key={bid} value={bid}>{bid === branchId ? branchName : bid}</option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] font-semibold text-primary truncate">{branchName}</p>
              )}
            </div>
          )}
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

      {/* Stacked notification toasts */}
      {visibleToasts.map((toast, index) => (
        <NotificationToast
          key={toast.id}
          toast={toast}
          index={index}
          onDone={removeToast}
        />
      ))}
    </div>
  )
}

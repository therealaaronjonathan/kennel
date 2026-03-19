import { signOut } from 'firebase/auth'
import { LayoutDashboard, UserPlus, LayoutList, ReceiptText, Settings, LogOut } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/features/auth'
import { useClinic } from '@/features/clinic'
import { useCompletedVisits } from '@/features/dashboard/services/use-completed-visits'

const NAV_ITEMS = [
  { to: '/reception/home', label: 'Home', Icon: LayoutDashboard },
  { to: '/reception/checkin', label: 'Check-in', Icon: UserPlus },
  { to: '/reception/queue', label: 'Queue', Icon: LayoutList },
  { to: '/reception/checkout', label: 'Check-out', Icon: ReceiptText, badge: true },
  { to: '/reception/settings', label: 'Settings', Icon: Settings },
]

export default function ReceptionistLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { clinicId, branchId } = useClinic()
  const { visits: unbilledVisits } = useCompletedVisits(clinicId, branchId)
  const unbilledCount = unbilledVisits.length

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
    </div>
  )
}

import { signOut } from 'firebase/auth'
import { LayoutDashboard, Building2, GitBranch, Stethoscope, Users, BookOpen, LogOut } from 'lucide-react'
import { NavLink, Outlet, useNavigate, useMatch } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/features/auth'

export function AdminLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Detect if we're on a clinic-specific route
  const clinicMatch = useMatch('/admin/clinics/:id/*')
  const clinicId = clinicMatch?.params?.id ?? null

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
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted mt-2">
            Admin Panel
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-[9px] rounded-[4px] text-[13px] font-semibold transition-colors border',
                isActive
                  ? 'bg-surface-2 border-border-active text-primary'
                  : 'border-transparent text-muted hover:bg-surface-2/60 hover:text-foreground',
              )
            }
          >
            <LayoutDashboard size={15} className="flex-shrink-0" />
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/clinics"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-[9px] rounded-[4px] text-[13px] font-semibold transition-colors border',
                isActive
                  ? 'bg-surface-2 border-border-active text-primary'
                  : 'border-transparent text-muted hover:bg-surface-2/60 hover:text-foreground',
              )
            }
          >
            <Building2 size={15} className="flex-shrink-0" />
            Clinics
          </NavLink>

          {/* Context section — only shown when on a clinic-specific route */}
          {clinicId && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Clinic
                </p>
              </div>

              <NavLink
                to={`/admin/clinics/${clinicId}/branches`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-[9px] rounded-[4px] text-[13px] font-semibold transition-colors border',
                    isActive
                      ? 'bg-surface-2 border-border-active text-primary'
                      : 'border-transparent text-muted hover:bg-surface-2/60 hover:text-foreground',
                  )
                }
              >
                <GitBranch size={15} className="flex-shrink-0" />
                Branches
              </NavLink>

              <NavLink
                to={`/admin/clinics/${clinicId}/doctors`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-[9px] rounded-[4px] text-[13px] font-semibold transition-colors border',
                    isActive
                      ? 'bg-surface-2 border-border-active text-primary'
                      : 'border-transparent text-muted hover:bg-surface-2/60 hover:text-foreground',
                  )
                }
              >
                <Stethoscope size={15} className="flex-shrink-0" />
                Doctors
              </NavLink>

              <NavLink
                to={`/admin/clinics/${clinicId}/staff`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-[9px] rounded-[4px] text-[13px] font-semibold transition-colors border',
                    isActive
                      ? 'bg-surface-2 border-border-active text-primary'
                      : 'border-transparent text-muted hover:bg-surface-2/60 hover:text-foreground',
                  )
                }
              >
                <Users size={15} className="flex-shrink-0" />
                Staff
              </NavLink>

              <NavLink
                to={`/admin/clinics/${clinicId}/catalogs`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-[9px] rounded-[4px] text-[13px] font-semibold transition-colors border',
                    isActive
                      ? 'bg-surface-2 border-border-active text-primary'
                      : 'border-transparent text-muted hover:bg-surface-2/60 hover:text-foreground',
                  )
                }
              >
                <BookOpen size={15} className="flex-shrink-0" />
                Catalogs
              </NavLink>
            </>
          )}
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

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <Outlet />
      </div>
    </div>
  )
}

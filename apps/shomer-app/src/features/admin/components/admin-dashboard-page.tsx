import { Link } from 'react-router-dom'
import { Building2, ArrowRight } from 'lucide-react'
import { useAuth } from '@/features/auth'

export function AdminDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <header className="h-[52px] border-b border-border-base bg-surface flex items-center px-6 flex-shrink-0">
        <h1 className="font-display text-[18px] font-bold text-foreground leading-none">
          Admin Dashboard
        </h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <div>
            <p className="text-[20px] font-bold text-foreground">
              Welcome{user?.displayName ? `, ${user.displayName}` : ''}
            </p>
            <p className="text-[13px] text-muted mt-1">
              Manage clinics, branches, doctors, staff, and service catalogs.
            </p>
          </div>

          <Link
            to="/admin/clinics"
            className="flex items-center justify-between px-5 py-4 rounded-[4px] border border-border-base bg-surface hover:bg-surface-2 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-[4px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-foreground">Clinics</p>
                <p className="text-[12px] text-muted mt-0.5">
                  Add and manage clinic profiles, branding, and settings
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-muted group-hover:text-primary transition-colors flex-shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  )
}

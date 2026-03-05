import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/features/auth'
import { Button } from '@/components/ui/button'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  async function handleLogout() {
    await signOut(auth)
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header
        className="flex h-[52px] items-center justify-between border-b px-6"
        style={{ borderColor: 'rgba(26, 24, 37, 0.08)', backgroundColor: 'var(--ds-surface)' }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/logos/shomer-icon-beige.png"
            alt=""
            className="h-9 w-9 flex-shrink-0 rounded-[4px] object-contain select-none"
          />
          <span
            className="text-[15px] font-bold text-foreground"
            style={{ fontFamily: '"BC Alphapipe", Georgia, serif' }}
          >
            Shomer
          </span>
          {/* Separator */}
          <span
            className="hidden sm:inline"
            style={{ color: 'rgba(26, 24, 37, 0.15)', fontSize: '14px' }}
          >
            /
          </span>
          <span className="hidden text-[12px] font-semibold text-muted sm:inline">
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="hidden text-[12px] text-muted sm:inline">
              {user.email}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Content area */}
      <main className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-4xl">🐾</span>
          <p className="text-[13px] font-semibold text-muted">
            Dashboard coming soon
          </p>
          <button
            type="button"
            onClick={() => navigate('/checkin')}
            className="rounded-[4px] bg-primary px-5 py-2 text-[13px] font-semibold text-white hover:opacity-85 transition-opacity"
          >
            Go to Check-in
          </button>
        </div>
      </main>
    </div>
  )
}

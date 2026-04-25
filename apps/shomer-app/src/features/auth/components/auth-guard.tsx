import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import { useClinic, type StaffRole } from '@/features/clinic'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/logos/shomer-icon-beige.png"
          alt=""
          className="h-14 w-14 rounded-[6px] object-contain select-none"
        />
        <div
          className="h-[3px] w-10 overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(153, 121, 255, 0.15)' }}
        >
          <div
            className="h-full w-5 rounded-full bg-primary animate-[loading-bar_1.2s_ease-in-out_infinite]"
          />
        </div>
      </div>
    </div>
  )
}

function getRoleHome(role: StaffRole): string {
  if (role === 'admin' || role === 'owner') return '/admin'
  if (role === 'doctor') return '/vet'
  return '/reception/home'
}

interface AuthGuardProps {
  children: React.ReactNode
  allowedRoles?: StaffRole[]
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const { role, loading: clinicLoading } = useClinic()

  const authorized =
    !!user && (!allowedRoles || (!!role && allowedRoles.includes(role)))

  // While inside an authenticated route, swallow browser back/forward —
  // re-push current URL on every popstate so the user can't escape via
  // the back button. In-app navigation uses the app's own UI.
  useEffect(() => {
    if (!authorized) return
    window.history.pushState(null, '', window.location.href)
    function onPop() {
      window.history.pushState(null, '', window.location.href)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [authorized])

  if (authLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  // Role-restricted route — wait for clinic data, then enforce
  if (allowedRoles) {
    if (clinicLoading) return <LoadingScreen />
    if (!role) return <Navigate to="/login" replace />
    if (!allowedRoles.includes(role)) {
      return <Navigate to={getRoleHome(role)} replace />
    }
  }

  return <>{children}</>
}

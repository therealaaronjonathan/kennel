import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'

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

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

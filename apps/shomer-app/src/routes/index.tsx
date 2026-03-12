import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import RootLayout from '@/app/root-layout'
import { AuthGuard } from '@/features/auth/components/auth-guard'

const LoginPage = lazy(() =>
  import('@/features/auth/components/login-page').then(m => ({ default: m.LoginPage }))
)
const DashboardPage = lazy(() =>
  import('@/features/dashboard/components/dashboard-page').then(m => ({ default: m.DashboardPage }))
)
const CheckinPage = lazy(() =>
  import('@/features/checkin/components/checkin-page').then(m => ({ default: m.CheckinPage }))
)
const QueuePage = lazy(() =>
  import('@/features/queue/components/queue-page').then(m => ({ default: m.QueuePage }))
)
const VetPage = lazy(() =>
  import('@/features/vet/components/vet-page').then(m => ({ default: m.VetPage }))
)

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
      {
        path: 'login',
        element: (
          <Suspense fallback={<div className="min-h-screen bg-surface" />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <AuthGuard>
            <Suspense fallback={<div className="min-h-screen bg-background" />}>
              <DashboardPage />
            </Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'checkin',
        element: (
          <AuthGuard>
            <Suspense fallback={<div className="min-h-screen bg-background" />}>
              <CheckinPage />
            </Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'vet',
        element: (
          <AuthGuard>
            <Suspense fallback={<div className="h-screen bg-background" />}>
              <VetPage />
            </Suspense>
          </AuthGuard>
        ),
      },
      {
        // Public — no AuthGuard
        path: 'queue/:doctorId',
        element: (
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <QueuePage />
          </Suspense>
        ),
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

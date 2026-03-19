import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import RootLayout from '@/app/root-layout'
import ReceptionistLayout from '@/app/receptionist-layout'
import { AuthGuard } from '@/features/auth/components/auth-guard'

const LoginPage = lazy(() =>
  import('@/features/auth/components/login-page').then(m => ({ default: m.LoginPage }))
)
const ReceptionHomePage = lazy(() =>
  import('@/features/reception/components/reception-home').then(m => ({ default: m.ReceptionHomePage }))
)
const CheckinPage = lazy(() =>
  import('@/features/checkin/components/checkin-page').then(m => ({ default: m.CheckinPage }))
)
const ReceptionQueuePage = lazy(() =>
  import('@/features/reception/components/queue-page').then(m => ({ default: m.ReceptionQueuePage }))
)
const CheckoutPage = lazy(() =>
  import('@/features/checkout/components/checkout-page').then(m => ({ default: m.CheckoutPage }))
)
const SettingsPage = lazy(() =>
  import('@/features/settings/components/settings-page').then(m => ({ default: m.SettingsPage }))
)
const VetPage = lazy(() =>
  import('@/features/vet/components/vet-page').then(m => ({ default: m.VetPage }))
)
const QueuePage = lazy(() =>
  import('@/features/queue/components/queue-page').then(m => ({ default: m.QueuePage }))
)

const suspense = (el: React.ReactNode) => (
  <Suspense fallback={<div className="h-screen bg-background" />}>{el}</Suspense>
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
        element: suspense(<LoginPage />),
      },

      // ── Old routes → redirect ─────────────────────────────────────────────
      { path: 'dashboard', element: <Navigate to="/reception/queue" replace /> },
      { path: 'checkin',   element: <Navigate to="/reception/checkin" replace /> },
      { path: 'settings',  element: <Navigate to="/reception/settings" replace /> },

      // ── Receptionist shell ────────────────────────────────────────────────
      {
        path: 'reception',
        element: (
          <AuthGuard>
            <ReceptionistLayout />
          </AuthGuard>
        ),
        children: [
          { index: true, element: <Navigate to="/reception/home" replace /> },
          { path: 'home',     element: suspense(<ReceptionHomePage />) },
          { path: 'checkin',  element: suspense(<CheckinPage />) },
          { path: 'queue',    element: suspense(<ReceptionQueuePage />) },
          { path: 'checkout', element: suspense(<CheckoutPage />) },
          { path: 'settings', element: suspense(<SettingsPage />) },
        ],
      },

      // ── Vet console (unchanged) ───────────────────────────────────────────
      {
        path: 'vet',
        element: (
          <AuthGuard>
            {suspense(<VetPage />)}
          </AuthGuard>
        ),
      },

      // ── Public queue (owner-facing) ───────────────────────────────────────
      {
        path: 'queue/:doctorId',
        element: suspense(<QueuePage />),
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

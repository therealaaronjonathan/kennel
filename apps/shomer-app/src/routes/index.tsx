import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import RootLayout from '@/app/root-layout'
import ReceptionistLayout from '@/app/receptionist-layout'
import { AuthGuard } from '@/features/auth/components/auth-guard'

const LoginPage = lazy(() =>
  import('@/features/auth/components/login-page').then(m => ({ default: m.LoginPage }))
)
const SelectBranchPage = lazy(() =>
  import('@/features/clinic/components/select-branch-page').then(m => ({ default: m.SelectBranchPage }))
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
const VisitHistoryPage = lazy(() =>
  import('@/features/visit-history/components/visit-history-page').then(m => ({ default: m.VisitHistoryPage }))
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
const AdminLayout = lazy(() =>
  import('@/app/admin-layout').then(m => ({ default: m.AdminLayout }))
)
const AdminDashboardPage = lazy(() =>
  import('@/features/admin/components/admin-dashboard-page').then(m => ({ default: m.AdminDashboardPage }))
)
const AdminClinicsPage = lazy(() =>
  import('@/features/admin/components/admin-clinics-page').then(m => ({ default: m.AdminClinicsPage }))
)
const AdminClinicDetailPage = lazy(() =>
  import('@/features/admin/components/admin-clinic-detail-page').then(m => ({ default: m.AdminClinicDetailPage }))
)
const AdminBranchesPage = lazy(() =>
  import('@/features/admin/components/admin-branches-page').then(m => ({ default: m.AdminBranchesPage }))
)
const AdminDoctorsPage = lazy(() =>
  import('@/features/admin/components/admin-doctors-page').then(m => ({ default: m.AdminDoctorsPage }))
)
const AdminStaffPage = lazy(() =>
  import('@/features/admin/components/admin-staff-page').then(m => ({ default: m.AdminStaffPage }))
)
const AdminCatalogsPage = lazy(() =>
  import('@/features/admin/components/admin-catalogs-page').then(m => ({ default: m.AdminCatalogsPage }))
)
const VisitSummaryPage = lazy(() =>
  import('@/features/summary/components/visit-summary-page').then(m => ({ default: m.VisitSummaryPage }))
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

      // ── Branch selector ───────────────────────────────────────────────────
      {
        path: 'select-branch',
        element: (
          <AuthGuard>
            {suspense(<SelectBranchPage />)}
          </AuthGuard>
        ),
      },

      // ── Old routes → redirect ─────────────────────────────────────────────
      { path: 'dashboard', element: <Navigate to="/reception/queue" replace /> },
      { path: 'checkin',   element: <Navigate to="/reception/checkin" replace /> },
      { path: 'settings',  element: <Navigate to="/reception/settings" replace /> },

      // ── Receptionist shell ────────────────────────────────────────────────
      {
        path: 'reception',
        element: (
          <AuthGuard allowedRoles={['receptionist', 'admin', 'owner']}>
            <ReceptionistLayout />
          </AuthGuard>
        ),
        children: [
          { index: true, element: <Navigate to="/reception/home" replace /> },
          { path: 'home',     element: suspense(<ReceptionHomePage />) },
          { path: 'checkin',  element: suspense(<CheckinPage />) },
          { path: 'queue',    element: suspense(<ReceptionQueuePage />) },
          { path: 'checkout', element: suspense(<CheckoutPage />) },
          { path: 'history',  element: suspense(<VisitHistoryPage />) },
          { path: 'settings', element: suspense(<SettingsPage />) },
        ],
      },

      // ── Vet console ───────────────────────────────────────────────────────
      {
        path: 'vet',
        element: (
          <AuthGuard allowedRoles={['doctor']}>
            {suspense(<VetPage />)}
          </AuthGuard>
        ),
      },

      // ── Admin panel ───────────────────────────────────────────────────────
      {
        path: 'admin',
        element: (
          <AuthGuard allowedRoles={['admin', 'owner']}>
            {suspense(<AdminLayout />)}
          </AuthGuard>
        ),
        children: [
          { index: true, element: suspense(<AdminDashboardPage />) },
          { path: 'clinics', element: suspense(<AdminClinicsPage />) },
          { path: 'clinics/:id', element: suspense(<AdminClinicDetailPage />) },
          { path: 'clinics/:id/branches', element: suspense(<AdminBranchesPage />) },
          { path: 'clinics/:id/doctors', element: suspense(<AdminDoctorsPage />) },
          { path: 'clinics/:id/staff', element: suspense(<AdminStaffPage />) },
          { path: 'clinics/:id/catalogs', element: suspense(<AdminCatalogsPage />) },
        ],
      },

      // ── Public queue (owner-facing) ───────────────────────────────────────
      {
        path: 'queue/:doctorId',
        element: suspense(<QueuePage />),
      },

      // ── Consultation summary (public) ─────────────────────────────────────
      {
        path: 'visit/:visitId/summary',
        element: suspense(<VisitSummaryPage />),
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

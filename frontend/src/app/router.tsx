import { lazy, Suspense, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PageSpinner } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/features/auth/AuthContext'
import { GuestOnly, RequireAuth } from '@/features/auth/RouteGuards'
import { LandingPage } from '@/pages/LandingPage'

/** Lazy-load a named page export so each page ships as its own chunk. */
function page<K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => loader().then((m) => ({ default: m[name] })))
}

const LoginPage = page(() => import('@/pages/auth/LoginPage'), 'LoginPage')
const RegisterPage = page(() => import('@/pages/auth/RegisterPage'), 'RegisterPage')
const ForgotPasswordPage = page(() => import('@/pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage')
const FeedPage = page(() => import('@/pages/FeedPage'), 'FeedPage')
const PostDetailPage = page(() => import('@/pages/PostDetailPage'), 'PostDetailPage')
const NewPostPage = page(() => import('@/pages/PostEditorPages'), 'NewPostPage')
const EditPostPage = page(() => import('@/pages/PostEditorPages'), 'EditPostPage')
const ProfilePage = page(() => import('@/pages/ProfilePage'), 'ProfilePage')
const SettingsPage = page(() => import('@/pages/SettingsPage'), 'SettingsPage')
const ApplicationsPage = page(() => import('@/pages/ApplicationsPage'), 'ApplicationsPage')
const NotificationsPage = page(() => import('@/pages/NotificationsPage'), 'NotificationsPage')
const WalletPage = page(() => import('@/pages/WalletPage'), 'WalletPage')
const InvitationsPage = page(() => import('@/pages/InvitationsPage'), 'InvitationsPage')
const InboxPage = page(() => import('@/pages/InboxPage'), 'InboxPage')
const TermsPage = page(() => import('@/pages/LegalPage'), 'TermsPage')
const PrivacyPage = page(() => import('@/pages/LegalPage'), 'PrivacyPage')
const AdminLayout = page(() => import('@/pages/admin/AdminLayout'), 'AdminLayout')
const AdminOverviewPage = page(() => import('@/pages/admin/AdminOverviewPage'), 'AdminOverviewPage')
const AdminUsersPage = page(() => import('@/pages/admin/AdminUsersPage'), 'AdminUsersPage')
const AdminAdsPage = page(() => import('@/pages/admin/AdminAdsPage'), 'AdminAdsPage')
const AdminWithdrawalsPage = page(() => import('@/pages/admin/AdminWithdrawalsPage'), 'AdminWithdrawalsPage')
const AdminVacanciesPage = page(() => import('@/pages/admin/AdminVacanciesPage'), 'AdminVacanciesPage')
const NotFoundPage = page(() => import('@/pages/NotFoundPage'), 'NotFoundPage')

function Home() {
  const { user } = useAuth()
  return user ? <Navigate to="/feed" replace /> : <LandingPage />
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        <Route index element={<Home />} />

        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="register/company" element={<Navigate to="/register?type=company" replace />} />
          <Route path="register/individual" element={<Navigate to="/register" replace />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route path="terms" element={<TermsPage />} />
        <Route path="privacy" element={<PrivacyPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="feed" element={<FeedPage />} />
            <Route path="posts/:id" element={<PostDetailPage />} />
            <Route path="u/:id" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />

            <Route element={<RequireAuth allow={['Company', 'Individual']} />}>
              <Route path="applications" element={<ApplicationsPage />} />
            </Route>

            <Route element={<RequireAuth allow={['Individual']} />}>
              <Route path="wallet" element={<WalletPage />} />
              <Route path="inbox" element={<InboxPage />} />
            </Route>

            <Route element={<RequireAuth allow={['Company']} />}>
              <Route path="posts/new" element={<NewPostPage />} />
              <Route path="posts/:id/edit" element={<EditPostPage />} />
              <Route path="invitations" element={<InvitationsPage />} />
            </Route>

            <Route element={<RequireAuth allow={['Admin']} />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
                <Route path="vacancies" element={<AdminVacanciesPage />} />
                <Route path="ads" element={<AdminAdsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

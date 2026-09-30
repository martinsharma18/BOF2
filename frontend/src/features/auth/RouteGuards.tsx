import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { AccountType } from '@/lib/types'
import { useAuth } from './AuthContext'

/** Only for logged-in users; optionally limited to certain account types. */
export function RequireAuth({ allow }: { allow?: AccountType[] }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (allow && !allow.includes(user.accountType)) return <Navigate to="/feed" replace />
  return <Outlet />
}

/** Login / register pages: bounce already-logged-in users to the feed. */
export function GuestOnly() {
  const { user } = useAuth()
  return user ? <Navigate to="/feed" replace /> : <Outlet />
}

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { AccountType } from '@/lib/types'
import { useAuth } from './AuthContext'

export function RequireAuth({ allow }: { allow?: AccountType[] }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (allow && !allow.includes(user.accountType)) return <Navigate to="/feed" replace />
  return <Outlet />
}

export function GuestOnly() {
  const { user } = useAuth()
  return user ? <Navigate to="/feed" replace /> : <Outlet />
}

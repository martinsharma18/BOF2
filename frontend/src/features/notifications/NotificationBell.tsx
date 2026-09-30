import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { NavLink } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/cn'
import { notificationKeys, useUnreadCount } from './api'

export function NotificationBell() {
  const unread = useUnreadCount().data ?? 0
  const queryClient = useQueryClient()
  const previous = useRef(unread)

  // Something new happened: refresh the screens it could affect, so the app feels live without websockets.
  useEffect(() => {
    if (unread > previous.current) {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list })
      void queryClient.invalidateQueries({ queryKey: ['applications'] })
      void queryClient.invalidateQueries({ queryKey: ['wallet'] })
    }
    previous.current = unread
  }, [unread, queryClient])

  return (
    <NavLink
      to="/notifications"
      aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      className={({ isActive }) =>
        cn(
          'relative flex size-10 items-center justify-center rounded-full transition hover:bg-slate-100',
          isActive ? 'text-brand-600' : 'text-slate-600',
        )
      }
    >
      <Bell className="size-5" />
      {unread > 0 && <UnreadBadge count={unread} className="absolute top-1 right-1" />}
    </NavLink>
  )
}

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white ring-2 ring-white',
        className,
      )}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

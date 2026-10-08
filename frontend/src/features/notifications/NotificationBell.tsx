import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { AppNotification } from '@/lib/types'
import { notificationKeys, useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useUnreadCount } from './api'
import { NotificationItem } from './NotificationItem'

export function NotificationBell() {
  const unread = useUnreadCount().data ?? 0
  const queryClient = useQueryClient()
  const previous = useRef(unread)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  // Remember which page the panel was opened on, so navigating anywhere closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const setOpen = (next: boolean | ((v: boolean) => boolean)) =>
    setOpenOn((typeof next === 'function' ? next(open) : next) ? pathname : null)

  // Something new happened: refresh the screens it could affect, so the app feels live without websockets.
  useEffect(() => {
    if (unread > previous.current) {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.list })
      void queryClient.invalidateQueries({ queryKey: ['applications'] })
      void queryClient.invalidateQueries({ queryKey: ['wallet'] })
    }
    previous.current = unread
  }, [unread, queryClient])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpenOn(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn('relative flex size-10 items-center justify-center rounded-full transition hover:bg-slate-100', open ? 'bg-slate-100 text-brand-600' : 'text-slate-600')}
      >
        <Bell className="size-5" />
        {unread > 0 && <UnreadBadge count={unread} className="absolute top-1 right-1" />}
      </button>
      {open && <BellPanel unread={unread} />}
    </div>
  )
}

function BellPanel({ unread }: { unread: number }) {
  const navigate = useNavigate()
  const list = useNotifications({ pageSize: 6 })
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const items = list.data?.pages[0]?.items ?? []

  const open = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <div
      role="dialog"
      aria-label="Latest notifications"
      className="absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] origin-top-right animate-pop-in overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-slate-200"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="font-semibold text-slate-900">
          Notifications {unread > 0 && <span className="text-sm font-medium text-accent-600">· {unread} new</span>}
        </p>
        {unread > 0 && (
          <button type="button" onClick={() => markAll.mutate()} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
            <CheckCheck className="size-3.5" /> Mark all read
          </button>
        )}
      </div>
      <div className="max-h-[60dvh] divide-y divide-slate-100 overflow-y-auto">
        {list.isLoading ? (
          <div className="flex justify-center py-8 text-brand-500">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up.</p>
        ) : (
          items.map((n) => <NotificationItem key={n.id} notification={n} onOpen={() => open(n)} compact />)
        )}
      </div>
      <Link to="/notifications" className="block border-t border-slate-100 py-2.5 text-center text-sm font-semibold text-brand-600 hover:bg-slate-50">
        See all notifications
      </Link>
    </div>
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

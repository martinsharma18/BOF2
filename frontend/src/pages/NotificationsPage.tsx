import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { Alert, Button, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { WithRail } from '@/components/layout/AppShell'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/features/notifications/api'
import { dayGroup } from '@/features/notifications/meta'
import { NotificationItem } from '@/features/notifications/NotificationItem'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { AppNotification } from '@/lib/types'
import { FeedRail } from './FeedRail'

export function NotificationsPage() {
  useDocumentTitle('Notifications')
  const navigate = useNavigate()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const list = useNotifications({ unreadOnly })
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const items = list.data?.pages.flatMap((p) => p.items) ?? []
  const hasUnread = unreadOnly ? items.length > 0 : items.some((n) => !n.isRead)

  const open = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id)
    if (n.link) navigate(n.link)
  }

  // Group into Today / Yesterday / Earlier, keeping the newest-first order.
  const groups = items.reduce<{ label: string; items: AppNotification[] }[]>((acc, n) => {
    const label = dayGroup(n.createdAt)
    const last = acc[acc.length - 1]
    if (last?.label === label) last.items.push(n)
    else acc.push({ label, items: [n] })
    return acc
  }, [])

  return (
    <WithRail rail={<FeedRail />}>
      <PageHeader
        title="Notifications"
        description={
          <>
            Applications, hiring, claims, payments, messages and withdrawals. Invitations and vacancies are in your{' '}
            <Link to="/inbox" className="font-semibold text-brand-600 hover:underline">
              Inbox
            </Link>
            .
          </>
        }
        actions={
          hasUnread && (
            <Button variant="secondary" size="sm" icon={<CheckCheck className="size-4" />} loading={markAll.isPending} onClick={() => markAll.mutate()}>
              Mark all as read
            </Button>
          )
        }
      />

      <div className="mb-4 flex w-fit gap-1 rounded-xl bg-slate-200/60 p-1" role="tablist" aria-label="Show">
        {[
          { value: false, label: 'All' },
          { value: true, label: 'Unread' },
        ].map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={unreadOnly === t.value}
            onClick={() => setUnreadOnly(t.value)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-semibold transition',
              unreadOnly === t.value ? 'bg-white text-slate-900 shadow-card' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.isError ? (
        <Alert>{getErrorMessage(list.error)}</Alert>
      ) : list.isLoading ? (
        <Card className="divide-y divide-slate-100">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 p-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="size-6" />}
            title={unreadOnly ? 'No unread notifications' : "You're all caught up"}
            description="We'll let you know when something happens."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-2 px-1 text-xs font-bold tracking-wide text-slate-500 uppercase">{g.label}</h2>
              <Card className="divide-y divide-slate-100 overflow-hidden">
                {g.items.map((n) => (
                  <NotificationItem key={n.id} notification={n} onOpen={() => open(n)} />
                ))}
              </Card>
            </section>
          ))}
          {list.hasNextPage && (
            <div className="text-center">
              <Button variant="ghost" size="sm" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                Load older
              </Button>
            </div>
          )}
        </div>
      )}
    </WithRail>
  )
}

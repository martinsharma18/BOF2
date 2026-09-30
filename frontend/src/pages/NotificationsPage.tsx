import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Banknote, Bell, CheckCheck, Hand, CircleCheck, CircleX, ClipboardList, MessageSquare, Wallet } from 'lucide-react'
import { Alert, Button, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { WithRail } from '@/components/layout/AppShell'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/features/notifications/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import type { AppNotification, NotificationType } from '@/lib/types'
import { FeedRail } from './FeedRail'

const icons: Record<NotificationType, { icon: ReactNode; className: string }> = {
  ApplicationReceived: { icon: <ClipboardList className="size-4" />, className: 'bg-brand-50 text-brand-600' },
  ApplicationAccepted: { icon: <CircleCheck className="size-4" />, className: 'bg-emerald-50 text-emerald-600' },
  ApplicationRejected: { icon: <CircleX className="size-4" />, className: 'bg-red-50 text-red-600' },
  NewMessage: { icon: <MessageSquare className="size-4" />, className: 'bg-sky-50 text-sky-600' },
  PaymentReceived: { icon: <Wallet className="size-4" />, className: 'bg-accent-50 text-accent-600' },
  WithdrawalRequested: { icon: <Banknote className="size-4" />, className: 'bg-accent-50 text-accent-600' },
  WithdrawalPaid: { icon: <Banknote className="size-4" />, className: 'bg-emerald-50 text-emerald-600' },
  WithdrawalRejected: { icon: <Banknote className="size-4" />, className: 'bg-red-50 text-red-600' },
  PaymentClaimed: { icon: <Hand className="size-4" />, className: 'bg-accent-50 text-accent-600' },
}

export function NotificationsPage() {
  useDocumentTitle('Notifications')
  const navigate = useNavigate()
  const list = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const items = list.data?.pages.flatMap((p) => p.items) ?? []
  const hasUnread = items.some((n) => !n.isRead)

  const open = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <WithRail rail={<FeedRail />}>
      <PageHeader
        title="Notifications"
        description="Applications, messages, payments and withdrawals."
        actions={
          hasUnread && (
            <Button variant="secondary" size="sm" icon={<CheckCheck className="size-4" />} loading={markAll.isPending} onClick={() => markAll.mutate()}>
              Mark all as read
            </Button>
          )
        }
      />

      {list.isError ? (
        <Alert>{getErrorMessage(list.error)}</Alert>
      ) : list.isLoading ? (
        <Card className="divide-y divide-slate-100">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 p-4">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={<Bell className="size-6" />} title="You're all caught up" description="We'll let you know when something happens." />
        </Card>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => open(n)}
              className={cn('flex w-full gap-3 p-4 text-left transition hover:bg-slate-50', !n.isRead && 'bg-brand-50/50')}
            >
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', icons[n.type].className)}>
                {icons[n.type].icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-sm', n.isRead ? 'text-slate-700' : 'font-semibold text-slate-900')}>{n.title}</span>
                {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500">{n.body}</span>}
                <span className="mt-1 block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
              </span>
              {!n.isRead && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-accent-500" aria-label="Unread" />}
            </button>
          ))}
          {list.hasNextPage && (
            <div className="p-3 text-center">
              <Button variant="ghost" size="sm" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                Load older
              </Button>
            </div>
          )}
        </Card>
      )}
    </WithRail>
  )
}

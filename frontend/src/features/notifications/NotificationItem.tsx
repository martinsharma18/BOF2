import { ChevronRight } from 'lucide-react'
import { AccountTypeBadge, Avatar } from '@/components/ui'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import type { AppNotification } from '@/lib/types'
import { notificationMeta } from './meta'

/** One notification: coloured type icon, category, title, short text, who it's from and when. */
export function NotificationItem({ notification: n, onOpen, compact }: { notification: AppNotification; onOpen: () => void; compact?: boolean }) {
  const meta = notificationMeta[n.type]
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full gap-3 text-left transition hover:bg-slate-50',
        compact ? 'px-3 py-2.5' : 'px-4 py-3.5',
        !n.isRead && 'bg-brand-50/40',
      )}
    >
      <span className={cn('flex shrink-0 items-center justify-center rounded-full [&_svg]:size-4', compact ? 'size-8' : 'size-10', meta.className)} aria-hidden>
        {meta.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">{meta.category}</span>
          <span className="text-[11px] text-slate-400">· {timeAgo(n.createdAt)}</span>
          {!n.isRead && <span className="ml-auto size-2 shrink-0 rounded-full bg-accent-500" aria-label="Unread" />}
        </span>
        <span className={cn('mt-0.5 block text-sm', n.isRead ? 'text-slate-700' : 'font-semibold text-slate-900', compact && 'line-clamp-2')}>{n.title}</span>
        {n.body && !compact && <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500">{n.body}</span>}
        {!compact && (
          <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {n.actor && (
              <>
                <Avatar name={n.actor.displayName} src={n.actor.avatarUrl} size="xs" className="size-5 text-[9px]" />
                <span className="font-medium text-slate-700">{n.actor.displayName}</span>
                <AccountTypeBadge type={n.actor.accountType} />
              </>
            )}
            {n.link && (
              <span className="ml-auto inline-flex items-center gap-0.5 font-semibold text-brand-600 group-hover:underline">
                {meta.action}
                <ChevronRight className="size-3.5" />
              </span>
            )}
          </span>
        )}
      </span>
    </button>
  )
}

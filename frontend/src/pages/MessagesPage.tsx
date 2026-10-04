import { Link, useNavigate, useParams } from 'react-router-dom'
import { BriefcaseBusiness, MessagesSquare } from 'lucide-react'
import { Alert, Avatar, Button, ButtonLink, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { stageMeta, stageOf } from '@/features/applications/labels'
import { useAuth } from '@/features/auth/AuthContext'
import { useChats } from '@/features/chat/api'
import { ChatThread } from '@/features/chat/ChatThread'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import type { ChatSummary } from '@/lib/types'

const stageText: Record<string, string> = {
  brand: 'text-brand-600',
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-500',
  slate: 'text-slate-500',
}

/**
 * Messages, like a chat app: every application is one conversation with the company (or the applicant).
 * Wide screens: list left, open chat right. Phones: the list, and an open chat takes the whole screen.
 */
export function MessagesPage() {
  useDocumentTitle('Messages')
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div>
      <div className={cn(id && 'max-lg:hidden')}>
        <PageHeader title="Messages" description="One conversation per job. Agree on the work here; hire, claim and pay from the top of each chat." />
      </div>
      <Card className="overflow-hidden lg:grid lg:h-[calc(100dvh-13rem)] lg:min-h-[28rem] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className={cn('min-h-0 border-slate-100 lg:overflow-y-auto lg:border-r', id && 'max-lg:hidden')}>
          <ChatList activeId={id} />
        </div>

        {id ? (
          // Phones: the open chat covers the app like a messenger; wide screens: it fills the right pane.
          <div className="max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:pt-[env(safe-area-inset-top)] min-h-0 bg-white">
            <ChatThread key={id} applicationId={id} onBack={() => navigate('/messages')} />
          </div>
        ) : (
          <div className="hidden items-center justify-center gap-2 text-sm text-slate-400 lg:flex">
            <MessagesSquare className="size-4" /> Pick a conversation to open it
          </div>
        )}
      </Card>
    </div>
  )
}

function ChatList({ activeId }: { activeId?: string }) {
  const { canPost } = useAuth()
  const chats = useChats()
  const items = chats.data?.pages.flatMap((p) => p.items) ?? []

  if (chats.isError) return <Alert className="m-4">{getErrorMessage(chats.error)}</Alert>
  if (chats.isLoading)
    return (
      <div className="divide-y divide-slate-100">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 p-4">
            <Skeleton className="size-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  if (items.length === 0)
    return (
      <EmptyState
        icon={<MessagesSquare className="size-6" />}
        title="No conversations yet"
        description={
          canPost
            ? 'When someone applies to your post, their application starts a conversation here.'
            : 'Apply to a job and your conversation with the company starts here.'
        }
        action={canPost ? <ButtonLink to="/applications">See applicants</ButtonLink> : <ButtonLink to="/feed">Browse jobs</ButtonLink>}
      />
    )

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((c) => (
        <li key={c.applicationId}>
          <ChatRow chat={c} active={c.applicationId === activeId} />
        </li>
      ))}
      {chats.hasNextPage && (
        <li className="p-3 text-center">
          <Button variant="ghost" size="sm" loading={chats.isFetchingNextPage} onClick={() => void chats.fetchNextPage()}>
            Load older
          </Button>
        </li>
      )}
    </ul>
  )
}

function ChatRow({ chat: c, active }: { chat: ChatSummary; active: boolean }) {
  const { canPost } = useAuth()
  const stage = stageMeta[stageOf(c)]
  const unread = c.unread > 0

  return (
    <Link
      to={`/messages/${c.applicationId}`}
      replace={active}
      className={cn('flex gap-3 px-4 py-3 transition', active ? 'bg-brand-50/70' : 'hover:bg-slate-50 active:bg-slate-100')}
    >
      <Avatar name={c.other.displayName} src={c.other.avatarUrl} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-[15px] text-slate-900', unread ? 'font-bold' : 'font-semibold')}>{c.other.displayName}</span>
          <span className={cn('shrink-0 text-xs', unread ? 'font-semibold text-accent-600' : 'text-slate-400')}>{timeAgo(c.lastAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
          <BriefcaseBusiness className="size-3 shrink-0" />
          <span className="truncate">{c.postTitle}</span>
          <span className={cn('shrink-0 font-semibold', stageText[stage.tone])}>· {canPost ? stage.company : stage.individual}</span>
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className={cn('min-w-0 flex-1 truncate text-sm', unread ? 'font-semibold text-slate-900' : 'text-slate-500')}>
            {c.lastFromMe && <span className="text-slate-400">You: </span>}
            {c.lastMessage}
          </span>
          {unread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">
              {c.unread > 9 ? '9+' : c.unread}
            </span>
          )}
        </span>
      </span>
    </Link>
  )
}

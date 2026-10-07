import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Briefcase, CalendarClock, CheckCheck, ExternalLink, Inbox, Mail, MapPin, ShieldCheck, Trash2 } from 'lucide-react'
import { AccountTypeBadge, Alert, Avatar, Button, ButtonLink, Card, ConfirmDialog, EmptyState, PageHeader, Skeleton, toast } from '@/components/ui'
import { useDeleteInboxItem, useInbox, useMarkAllInboxRead, useMarkInboxRead } from '@/features/inbox/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDate, formatDay, timeAgo } from '@/lib/format'
import type { InboxItem, InboxItemKind } from '@/lib/types'
import { VacancyApplyBox } from '@/features/vacancies/VacancyApplyBox'

const tabs: { kind?: InboxItemKind; label: string }[] = [
  { label: 'All' },
  { kind: 'Invitation', label: 'Invitations' },
  { kind: 'Vacancy', label: 'Vacancies' },
]

/** Mail-style inbox: invitations from companies and vacancies from the super admin. List on the left, message on the right. */
export function InboxPage() {
  useDocumentTitle('Inbox')
  const [kind, setKind] = useState<InboxItemKind | undefined>()
  const [openId, setOpenId] = useState<string | null>(null)
  const list = useInbox(kind)
  const markRead = useMarkInboxRead()
  const markAll = useMarkAllInboxRead()

  const items = list.data?.pages.flatMap((p) => p.items) ?? []
  const open = items.find((i) => i.id === openId) ?? null
  const hasUnread = items.some((i) => !i.isRead)

  const select = (item: InboxItem) => {
    setOpenId(item.id)
    if (!item.isRead) markRead.mutate(item.id)
  }

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Invitations from companies and new vacancies. Other updates stay in Notifications."
        actions={
          hasUnread && (
            <Button variant="secondary" size="sm" icon={<CheckCheck className="size-4" />} loading={markAll.isPending} onClick={() => markAll.mutate()}>
              Mark all as read
            </Button>
          )
        }
      />

      <div className="mb-4 flex gap-1 rounded-xl bg-slate-200/60 p-1 sm:w-fit" role="tablist" aria-label="Show">
        {tabs.map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={kind === t.kind}
            onClick={() => {
              setKind(t.kind)
              setOpenId(null)
            }}
            className={cn(
              'flex-1 rounded-lg px-4 py-1.5 text-sm font-semibold transition',
              kind === t.kind ? 'bg-white text-slate-900 shadow-card' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.isError ? (
        <Alert>{getErrorMessage(list.error)}</Alert>
      ) : (
        <Card className="grid overflow-hidden lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          {/* Message list (hidden on small screens while a message is open) */}
          <div className={cn('border-slate-100 lg:max-h-[70dvh] lg:overflow-y-auto lg:border-r', open && 'hidden lg:block')}>
            {list.isLoading ? (
              <ListSkeleton />
            ) : items.length === 0 ? (
              <EmptyState icon={<Inbox className="size-6" />} title="Your inbox is empty" description="Invitations and vacancies will show up here." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <InboxRow item={item} active={item.id === openId} onSelect={() => select(item)} />
                  </li>
                ))}
                {list.hasNextPage && (
                  <li className="p-3 text-center">
                    <Button variant="ghost" size="sm" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                      Load older
                    </Button>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Reading pane */}
          <div className={cn('min-h-80', !open && 'hidden lg:flex lg:items-center lg:justify-center')}>
            {open ? (
              <Message item={open} onBack={() => setOpenId(null)} onDeleted={() => setOpenId(null)} />
            ) : (
              <p className="flex items-center gap-2 text-sm text-slate-400">
                <Mail className="size-4" /> Select a message to read it
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function SenderAvatar({ item, size }: { item: InboxItem; size: 'sm' | 'md' }) {
  if (item.sender) return <Avatar name={item.sender.displayName} src={item.sender.avatarUrl} size={size} />
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600', size === 'sm' ? 'size-9' : 'size-11')}>
      <ShieldCheck className={size === 'sm' ? 'size-4' : 'size-5'} />
    </span>
  )
}

function SenderName({ item }: { item: InboxItem }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate">{item.sender?.displayName ?? 'Super Admin'}</span>
      <AccountTypeBadge type={item.sender?.accountType ?? 'Admin'} className="shrink-0" />
    </span>
  )
}

function InboxRow({ item, active, onSelect }: { item: InboxItem; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn('flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50', active && 'bg-brand-50/70 hover:bg-brand-50', !item.isRead && !active && 'bg-white')}
    >
      <SenderAvatar item={item} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <SenderName item={item} />
          <span className="shrink-0">{timeAgo(item.createdAt)}</span>
        </span>
        <span className={cn('mt-0.5 flex items-center gap-1.5 text-sm', item.isRead ? 'text-slate-700' : 'font-bold text-slate-900')}>
          {!item.isRead && <span className="size-2 shrink-0 rounded-full bg-accent-500" aria-label="Unread" />}
          {item.kind === 'Vacancy' ? <Briefcase className="size-3.5 shrink-0 text-accent-500" aria-hidden /> : <Mail className="size-3.5 shrink-0 text-brand-500" aria-hidden />}
          <span className="truncate">{item.subject}</span>
        </span>
        <span className="mt-0.5 line-clamp-1 block text-xs text-slate-500">{item.preview}</span>
      </span>
    </button>
  )
}

function Message({ item, onBack, onDeleted }: { item: InboxItem; onBack: () => void; onDeleted: () => void }) {
  const remove = useDeleteInboxItem()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const v = item.vacancy
  const inv = item.invitation

  return (
    <article className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-6">
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} onClick={onBack} className="lg:hidden">
          Back
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 className="size-4" />}
          className="ml-auto text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setConfirmDelete(true)}
        >
          Delete
        </Button>
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() =>
            remove.mutate(item.id, {
              onSuccess: () => {
                setConfirmDelete(false)
                toast.success('Message deleted')
                onDeleted()
              },
              onError: (e) => toast.error(getErrorMessage(e)),
            })
          }
          title="Delete this message?"
          description="It will be removed from your inbox. This can't be undone."
          confirmLabel="Delete"
          danger
          loading={remove.isPending}
        />
      </div>

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-slate-900">{v ? v.title : item.subject}</h2>
        <div className="flex items-center gap-3">
          <SenderAvatar item={item} size="md" />
          <div className="min-w-0 text-sm">
            <div className="font-semibold text-slate-900">
              {item.sender ? (
                <Link to={`/u/${item.sender.id}`} className="hover:underline">
                  <SenderName item={item} />
                </Link>
              ) : (
                <SenderName item={item} />
              )}
            </div>
            <p className="text-xs text-slate-500">
              {item.kind === 'Vacancy' ? 'Vacancy' : 'Invitation'} · {formatDate(item.createdAt)}
            </p>
          </div>
        </div>

        {inv && (
          <>
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-slate-700">{inv.message}</p>
            <div className="flex flex-wrap gap-2">
              {inv.postId && (
                <ButtonLink to={`/posts/${inv.postId}`} icon={<ExternalLink className="size-4" />}>
                  Open {inv.postTitle ? `“${inv.postTitle}”` : 'the post'} and apply
                </ButtonLink>
              )}
              {item.sender && (
                <ButtonLink to={`/u/${item.sender.id}`} variant="secondary">
                  View company
                </ButtonLink>
              )}
            </div>
          </>
        )}

        {v && (
          <>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
              <li className="flex items-center gap-1.5">
                <Briefcase className="size-4 text-slate-400" /> {v.organization}
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="size-4 text-slate-400" /> {v.location}
              </li>
              {v.deadline && (
                <li className="flex items-center gap-1.5">
                  <CalendarClock className="size-4 text-slate-400" /> Apply by {formatDay(v.deadline)}
                </li>
              )}
            </ul>
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-slate-700">{v.description}</p>
            {v.howToApply && (
              <div className="rounded-xl bg-brand-50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">How to apply</p>
                {/^https?:\/\//i.test(v.howToApply.trim()) ? (
                  <a href={v.howToApply.trim()} target="_blank" rel="noopener noreferrer" className="mt-0.5 block font-semibold break-all text-brand-700 hover:underline">
                    {v.howToApply}
                  </a>
                ) : (
                  <p className="mt-0.5 font-medium whitespace-pre-line text-slate-900">{v.howToApply}</p>
                )}
              </div>
            )}
            <VacancyApplyBox vacancyId={v.id} />
          </>
        )}
      </div>
    </article>
  )
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 p-4">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

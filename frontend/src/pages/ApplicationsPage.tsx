import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList, X } from 'lucide-react'
import { Alert, Button, ButtonLink, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { WithRail } from '@/components/layout/AppShell'
import { useApplication, useApplications } from '@/features/applications/api'
import { ApplicationCard } from '@/features/applications/ApplicationCard'
import { useAuth } from '@/features/auth/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { ApplicationStatus } from '@/lib/types'
import { FeedRail } from './FeedRail'

const statusTabs: { value: ApplicationStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'Pending', label: 'Waiting' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Rejected', label: 'Declined' },
]

export function ApplicationsPage() {
  const { canPost } = useAuth()
  const title = canPost ? 'Applicants' : 'My applications'
  useDocumentTitle(title)

  const [params, setParams] = useSearchParams()
  const postId = params.get('post') ?? undefined
  const focusId = params.get('id')
  const [status, setStatus] = useState<ApplicationStatus>()
  const [page, setPage] = useState(1)

  const list = useApplications({ postId, status, page })
  const focused = useApplication(focusId)
  const data = list.data
  const filteredPostTitle = postId ? data?.items[0]?.postTitle : undefined

  const clear = (key: string) => {
    const next = new URLSearchParams(params)
    next.delete(key)
    setParams(next, { replace: true })
    setPage(1)
  }

  return (
    <WithRail rail={<FeedRail />}>
      <PageHeader
        title={title}
        description={
          canPost
            ? 'People who applied to your posts. Review their profile, message them, accept and pay.'
            : 'Track the posts you applied to and chat with companies.'
        }
      />

      {focusId && focused.data && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-accent-700 uppercase">From your notification</p>
            <button type="button" onClick={() => clear('id')} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
              Dismiss
            </button>
          </div>
          <ApplicationCard key={focused.data.id} application={focused.data} highlighted autoOpenChat={focused.data.messageCount > 0} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Filter by status" className="flex gap-1 rounded-xl bg-slate-200/60 p-1">
          {statusTabs.map((t) => (
            <button
              key={t.label}
              type="button"
              role="tab"
              aria-selected={status === t.value}
              onClick={() => {
                setStatus(t.value)
                setPage(1)
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                status === t.value ? 'bg-white text-slate-900 shadow-card' : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {postId && (
          <button
            type="button"
            onClick={() => clear('post')}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100"
          >
            <span className="truncate">Post: {filteredPostTitle ?? 'selected post'}</span>
            <X className="size-3.5 shrink-0" />
          </button>
        )}
      </div>

      {list.isError ? (
        <Alert>{getErrorMessage(list.error)}</Alert>
      ) : !data ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </Card>
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title={canPost ? 'No applications yet' : "You haven't applied to anything yet"}
            description={
              canPost ? 'When people apply to your posts, they show up here and you get a notification.' : (
                <>
                  Browse the <Link to="/feed" className="font-semibold text-brand-600 hover:underline">feed</Link> and tap Apply on a post. Once a company accepts you, tap Claim to get paid.
                </>
              )
            }
            action={canPost ? <ButtonLink to="/posts/new">Create a post</ButtonLink> : <ButtonLink to="/feed">Browse posts</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.items
            .filter((a) => a.id !== focused.data?.id)
            .map((a) => (
              <ApplicationCard key={a.id} application={a} />
            ))}
          {(page > 1 || data.hasMore) && (
            <div className="flex items-center justify-between pt-2 text-sm text-slate-500">
              <span>{data.totalCount} total</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="secondary" disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </WithRail>
  )
}

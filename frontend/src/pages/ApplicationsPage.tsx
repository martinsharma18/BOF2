import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { Alert, Button, ButtonLink, Card, EmptyState, PageHeader, Select, Skeleton } from '@/components/ui'
import { WithRail } from '@/components/layout/AppShell'
import { useApplication, useApplicationPosts, useApplications, useApplicationSummary, type ApplicationSummary } from '@/features/applications/api'
import { ApplicationCard } from '@/features/applications/ApplicationCard'
import { stageTabs, type ApplicationStage } from '@/features/applications/labels'
import { useAuth } from '@/features/auth/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { FeedRail } from './FeedRail'

const countKey: Record<ApplicationStage, keyof ApplicationSummary> = {
  New: 'new',
  Hired: 'hired',
  Claimed: 'claimed',
  Paid: 'paid',
  Declined: 'declined',
}

/** Tabs where the person looking has something to do; their counts are shown in orange. */
const actionStages: Record<'company' | 'individual', ApplicationStage[]> = {
  company: ['New', 'Claimed'],
  individual: ['Hired'],
}

/** Company: "Applicants" (people who applied to its posts). Individual: "My applications". Same page, worded per side. */
export function ApplicationsPage() {
  const { canPost } = useAuth()
  const side = canPost ? 'company' : 'individual'
  const title = canPost ? 'Applicants' : 'My applications'
  useDocumentTitle(title)

  const [params, setParams] = useSearchParams()
  const postId = params.get('post') ?? undefined
  const focusId = params.get('id')
  const [stage, setStage] = useState<ApplicationStage>()
  const [page, setPage] = useState(1)

  const list = useApplications({ postId, stage, page })
  const summary = useApplicationSummary(postId).data
  const focused = useApplication(focusId)
  const data = list.data

  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
    setPage(1)
  }

  return (
    <WithRail rail={<FeedRail />}>
      <PageHeader
        title={title}
        description={canPost ? 'Hire people who applied, then pay them when they claim.' : 'Your jobs and what to do next.'}
      />

      {focusId && focused.data && (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-accent-700">From your notification</span>
            <button type="button" onClick={() => setParam('id')} className="font-semibold text-slate-500 hover:text-slate-800">
              Dismiss
            </button>
          </div>
          <ApplicationCard key={focused.data.id} application={focused.data} highlighted />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Filter by stage" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:flex-1 sm:px-0">
          {stageTabs.map((t) => {
            const count = summary ? summary[t.stage ? countKey[t.stage] : 'all'] : 0
            const selected = stage === t.stage
            const needsAction = !!t.stage && actionStages[side].includes(t.stage) && count > 0
            return (
              <button
                key={t.company}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setStage(t.stage)
                  setPage(1)
                }}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                  selected ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900',
                )}
              >
                {canPost ? t.company : t.individual}
                {count > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[11px] tabular-nums',
                      needsAction ? 'bg-accent-500 text-white' : selected ? 'bg-white/20' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {canPost && <PostFilter value={postId} onChange={(id) => setParam('post', id)} />}
      </div>

      {list.isError ? (
        <Alert>{getErrorMessage(list.error)}</Alert>
      ) : !data ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Card key={i} className="space-y-3 p-4">
              <div className="flex gap-3">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-1 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title={stage || postId ? 'Nothing here' : canPost ? 'No applicants yet' : 'No applications yet'}
            description={
              stage || postId ? (
                'Try another tab.'
              ) : canPost ? (
                'When people apply to your posts, they show up here.'
              ) : (
                <>
                  Find a job on the{' '}
                  <Link to="/feed" className="font-semibold text-brand-600 hover:underline">
                    feed
                  </Link>{' '}
                  and tap Apply.
                </>
              )
            }
            action={!stage && !postId && (canPost ? <ButtonLink to="/posts/new">Create a post</ButtonLink> : <ButtonLink to="/feed">Browse jobs</ButtonLink>)}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.items
            .filter((a) => a.id !== focused.data?.id)
            .map((a) => (
              <ApplicationCard key={a.id} application={a} />
            ))}
          {(page > 1 || data.hasMore) && (
            <div className="flex items-center justify-between pt-1 text-sm text-slate-500">
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

/** Company: show applicants for one post. Only appears once there is more than one post with applicants. */
function PostFilter({ value, onChange }: { value?: string; onChange: (postId?: string) => void }) {
  const posts = useApplicationPosts(true).data
  if (!posts || (posts.length < 2 && !value)) return null

  return (
    <div className="sm:w-56">
      <label htmlFor="post-filter" className="sr-only">
        Post
      </label>
      <Select id="post-filter" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className="py-2">
        <option value="">All posts</option>
        {posts.map((p) => (
          <option key={p.postId} value={p.postId}>
            {p.title} ({p.new > 0 ? `${p.new} new` : p.total})
          </option>
        ))}
      </Select>
    </div>
  )
}

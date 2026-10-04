import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Banknote, ClipboardList, Hand, UserPlus, X } from 'lucide-react'
import { Alert, Button, ButtonLink, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { WithRail } from '@/components/layout/AppShell'
import { useApplication, useApplications, useApplicationSummary, type ApplicationSummary } from '@/features/applications/api'
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

export function ApplicationsPage() {
  const { canPost } = useAuth()
  const title = canPost ? 'Applicants' : 'My applications'
  useDocumentTitle(title)

  const [params, setParams] = useSearchParams()
  const postId = params.get('post') ?? undefined
  const focusId = params.get('id')
  const [stage, setStage] = useState<ApplicationStage>()
  const [page, setPage] = useState(1)

  const list = useApplications({ postId, stage, page })
  const summary = useApplicationSummary(postId).data
  const showStage = (next?: ApplicationStage) => {
    setStage(next)
    setPage(1)
  }
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
            ? 'Hire people who applied, then pay them when they claim. One application = one job = one payment.'
            : 'Every job you applied to, where it stands, and what to do next.'
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

      {summary && <ActionBar summary={summary} isCompany={canPost} onShow={showStage} />}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Filter by stage" className="scrollbar-none flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-200/60 p-1">
          {stageTabs.map((t) => {
            const count = summary ? summary[t.stage ? countKey[t.stage] : 'all'] : undefined
            const selected = stage === t.stage
            return (
              <button
                key={t.company}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => showStage(t.stage)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition',
                  selected ? 'bg-white text-slate-900 shadow-card' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {canPost ? t.company : t.individual}
                {count !== undefined && count > 0 && (
                  <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', selected ? 'bg-brand-100 text-brand-700' : 'bg-slate-300/60 text-slate-600')}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
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
            title={stage ? 'Nothing here right now' : canPost ? 'No applications yet' : "You haven't applied to anything yet"}
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

/** "Needs your action" shortcuts: the stages where this person has something to do. */
function ActionBar({ summary, isCompany, onShow }: { summary: ApplicationSummary; isCompany: boolean; onShow: (stage: ApplicationStage) => void }) {
  const items = isCompany
    ? [
        summary.claimed > 0 && { stage: 'Claimed' as const, icon: <Banknote className="size-4" />, text: `${summary.claimed} waiting for payment`, tone: 'bg-amber-50 text-amber-900 ring-amber-200' },
        summary.new > 0 && { stage: 'New' as const, icon: <UserPlus className="size-4" />, text: `${summary.new} new to review`, tone: 'bg-brand-50 text-brand-900 ring-brand-200' },
      ]
    : [
        summary.hired > 0 && { stage: 'Hired' as const, icon: <Hand className="size-4" />, text: `${summary.hired} hired: claim when the work is done`, tone: 'bg-emerald-50 text-emerald-900 ring-emerald-200' },
      ]
  const shown = items.filter(Boolean) as Exclude<(typeof items)[number], false>[]
  if (!shown.length) return null

  return (
    <div className="mb-4 flex flex-wrap gap-2" aria-label="Needs your action">
      {shown.map((i) => (
        <button
          key={i.stage}
          type="button"
          onClick={() => onShow(i.stage)}
          className={cn('inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition hover:brightness-95', i.tone)}
        >
          {i.icon}
          {i.text}
          <ArrowRight className="size-3.5" />
        </button>
      ))}
    </div>
  )
}

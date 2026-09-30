import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ClipboardList, Hand, ImageIcon, Link2, MapPin, MessageCircle, MoreHorizontal, Pencil, Send, Trash2, Users, VenusAndMars, Wallet } from 'lucide-react'
import { Avatar, Badge, Button, ButtonLink, Card, ConfirmDialog, Dialog, Menu, MenuItem, MenuSeparator, Skeleton, Textarea, toast } from '@/components/ui'
import { useApply } from '@/features/applications/api'
import { ClaimPaymentDialog } from '@/features/applications/ClaimPaymentDialog'
import { applicationStatusMeta } from '@/features/applications/labels'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage, getProblem } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatMoney, pluralize, timeAgo } from '@/lib/format'
import type { Post } from '@/lib/types'
import { useDeletePost } from './api'
import { FeedbackSection } from './FeedbackSection'
import { genderLabel, locationLabel, postTypeLabel } from './labels'
import { ReactionButton, ReactionSummary } from './ReactionBar'

const LONG_TEXT = 320

export function PostCard({
  post,
  expanded = false,
  onDeleted,
}: {
  post: Post
  /** Detail view: full text and feedback open by default. */
  expanded?: boolean
  onDeleted?: () => void
}) {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [showFeedback, setShowFeedback] = useState(expanded)
  const [showFullText, setShowFullText] = useState(expanded)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)
  const [applicationMessage, setApplicationMessage] = useState('')
  const apply = useApply(post.id)
  const deletePost = useDeletePost()

  const isOwner = post.author.id === user?.id
  const isIndividual = user?.accountType === 'Individual'
  const isLong = post.requirement.length > LONG_TEXT
  const postUrl = `/posts/${post.id}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(postUrl, window.location.origin).toString())
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  const handleDelete = () =>
    deletePost.mutate(post.id, {
      onSuccess: () => {
        setConfirmDelete(false)
        toast.success('Post deleted')
        onDeleted?.()
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  const submitApplication = () => {
    const message = applicationMessage.trim()
    if (!message) return
    apply.mutate(
      { kind: 'Apply', message },
      {
        onSuccess: () => {
          setApplicationMessage('')
          setApplyOpen(false)
          toast.success('Application sent. The company has been notified.')
        },
        onError: (error) => toast.error(getProblem(error)?.errors?.Message?.[0] ?? getErrorMessage(error)),
      },
    )
  }

  return (
    <Card className="animate-fade-in">
      {/* Author */}
      <header className="flex items-center gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <Link to={`/u/${post.author.id}`} className="shrink-0">
          <Avatar name={post.author.displayName} src={post.author.avatarUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/u/${post.author.id}`} className="block truncate font-semibold text-slate-900 hover:underline">
            {post.author.displayName}
          </Link>
          <p className="truncate text-xs text-slate-500">
            {post.author.companyName ? post.author.fullName : post.author.accountType}
            {' · '}
            <Link to={postUrl} className="hover:underline">
              <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
            </Link>
            {post.updatedAt && ' · edited'}
          </p>
        </div>
        <Badge tone="brand">{postTypeLabel(post.type)}</Badge>
        <Menu
          label="Post options"
          trigger={
            <span className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <MoreHorizontal className="size-5" />
            </span>
          }
        >
          <MenuItem icon={<Link2 className="size-4" />} onClick={copyLink}>
            Copy link
          </MenuItem>
          {isOwner && (
            <MenuItem icon={<Pencil className="size-4" />} onClick={() => navigate(`${postUrl}/edit`)}>
              Edit post
            </MenuItem>
          )}
          {(isOwner || isAdmin) && (
            <>
              <MenuSeparator />
              <MenuItem icon={<Trash2 className="size-4" />} danger onClick={() => setConfirmDelete(true)}>
                Delete post
              </MenuItem>
            </>
          )}
        </Menu>
      </header>

      {/* Content */}
      <div className="px-4 pt-3 sm:px-5">
        <h2 className="text-lg leading-snug font-bold">
          {expanded ? post.title : (
            <Link to={postUrl} className="hover:text-brand-700">
              {post.title}
            </Link>
          )}
        </h2>
        <p className={cn('mt-1.5 text-[15px] leading-relaxed break-words whitespace-pre-line text-slate-700', !showFullText && isLong && 'line-clamp-4')}>
          {post.requirement}
        </p>
        {isLong && !showFullText && (
          <button type="button" onClick={() => setShowFullText(true)} className="mt-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            Read more
          </button>
        )}
      </div>

      {/* Photo on the left, the four decision criteria on the right. */}
      <div className="mx-4 mt-4 grid gap-3 sm:mx-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
        {post.mediaUrl ? (
          <div className="overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
            <img src={post.mediaUrl} alt="" loading="lazy" className="h-full max-h-72 min-h-40 w-full object-cover" />
          </div>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 text-sm font-medium text-brand-700">
            <ImageIcon className="size-6 text-brand-300" aria-hidden />
            No photo
          </div>
        )}
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-200/70 ring-1 ring-slate-200/70 sm:grid-cols-1">
          <Detail icon={<Users className="size-4" />} label="Minimum people" value={`${post.minimumNumber}+`} />
          <Detail icon={<Wallet className="size-4" />} label="Maximum payment" value={formatMoney(post.maximumPayment)} highlight />
          <Detail icon={<VenusAndMars className="size-4" />} label="Gender" value={genderLabel(post)} />
          <Detail icon={<MapPin className="size-4" />} label="Area" value={locationLabel(post)} />
        </dl>
      </div>

      {isIndividual && !isOwner && <ApplicantActions post={post} onApply={() => setApplyOpen(true)} />}

      {isOwner && (
        <div className="mx-4 mt-3 sm:mx-5">
          <ButtonLink to={`/applications?post=${post.id}`} variant="soft" className="w-full" icon={<ClipboardList className="size-4" />}>
            {post.applicationCount > 0 ? `View ${pluralize(post.applicationCount, 'application')}` : 'No applications yet'}
          </ButtonLink>
        </div>
      )}

      {/* Stats + actions */}
      <div className="mt-3 flex items-center justify-between px-4 text-sm text-slate-500 sm:px-5">
        <ReactionSummary post={post} />
        {post.feedbackCount > 0 && (
          <button type="button" onClick={() => setShowFeedback((v) => !v)} className="ml-auto hover:underline">
            {post.feedbackCount} feedback
          </button>
        )}
      </div>
      <div className="mx-4 mt-2 flex items-center gap-1 border-t border-slate-100 py-1.5 sm:mx-5">
        <ReactionButton post={post} />
        <button
          type="button"
          onClick={() => setShowFeedback((v) => !v)}
          aria-expanded={showFeedback}
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          <MessageCircle className="size-4" /> Feedback
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        >
          <Link2 className="size-4" /> <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {showFeedback && (
        <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
          <FeedbackSection postId={post.id} autoFocus={!expanded} />
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        loading={deletePost.isPending}
        danger
        title="Delete this post?"
        description="The post, its reactions and all feedback will be removed permanently."
        confirmLabel="Delete post"
      />
      <Dialog
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Apply for this opportunity"
        description={<>Your message and <Link className="font-semibold text-brand-600 hover:underline" to={`/u/${user?.id}`}>profile</Link> will be shared with {post.author.displayName}.</>}
        footer={<><Button variant="secondary" onClick={() => setApplyOpen(false)}>Cancel</Button><Button icon={<Send className="size-4" />} loading={apply.isPending} disabled={!applicationMessage.trim()} onClick={submitApplication}>Send application</Button></>}
      >
        <label htmlFor={`application-${post.id}`} className="mb-2 block text-sm font-medium text-slate-700">A short message for the company</label>
        <Textarea id={`application-${post.id}`} rows={4} maxLength={1500} placeholder="Introduce yourself and tell them why you are interested…" value={applicationMessage} onChange={(event) => setApplicationMessage(event.target.value)} />
      </Dialog>
    </Card>
  )
}

/**
 * Apply and Claim for individuals. Apply sends the application; Claim unlocks once the company
 * accepts you and asks them to pay (the money then lands in your wallet).
 */
function ApplicantActions({ post, onApply }: { post: Post; onApply: () => void }) {
  const [claimOpen, setClaimOpen] = useState(false)
  const mine = post.myApplication
  const accepted = mine?.status === 'Accepted'
  const claimOpenAmount = mine?.claimedAmount ?? null
  const canClaim = accepted && claimOpenAmount === null

  let hint: ReactNode
  if (!mine) hint = 'Apply first. Claim unlocks when the company accepts you.'
  else if (mine.status === 'Pending') hint = 'Application sent. Claim unlocks when the company accepts you.'
  else if (mine.status === 'Rejected') hint = 'The company declined this application.'
  else if (claimOpenAmount !== null) hint = `Claim of ${formatMoney(claimOpenAmount)} sent. Waiting for the company to pay.`
  else if (mine.paidAmount > 0) hint = `${formatMoney(mine.paidAmount)} received in your wallet. Claim again for more work.`
  else hint = 'You’re accepted! Claim your payment when the work is done.'

  return (
    <div className="mx-4 mt-3 sm:mx-5">
      <div className="flex gap-2">
        <Button
          className="flex-1"
          variant={mine ? 'secondary' : 'primary'}
          icon={mine ? <CheckCircle2 className="size-4" /> : <Send className="size-4" />}
          disabled={!!mine}
          onClick={onApply}
        >
          {mine ? 'Applied' : 'Apply'}
        </Button>
        <Button
          variant="accent"
          className="flex-1"
          icon={<Hand className="size-4" />}
          disabled={!canClaim}
          title={canClaim ? undefined : typeof hint === 'string' ? hint : undefined}
          onClick={() => setClaimOpen(true)}
        >
          {claimOpenAmount !== null ? 'Claimed' : 'Claim'}
        </Button>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {mine && (
          <Link to={`/applications?id=${mine.id}`} className="hover:opacity-80">
            <Badge tone={applicationStatusMeta[mine.status].tone}>{applicationStatusMeta[mine.status].label}</Badge>
          </Link>
        )}
        <span>{hint}</span>
      </p>
      {mine && accepted && (
        <ClaimPaymentDialog
          applicationId={mine.id}
          companyName={post.author.displayName}
          suggestedAmount={Math.max(post.maximumPayment - mine.paidAmount, 0)}
          open={claimOpen}
          onClose={() => setClaimOpen(false)}
        />
      )}
    </div>
  )
}

function Detail({ icon, label, value, highlight }: { icon: ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 bg-slate-50 px-3 py-2.5">
      <span className={cn('mt-0.5', highlight ? 'text-accent-500' : 'text-brand-500')} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
        <dd className={cn('truncate text-sm font-semibold', highlight ? 'text-accent-700' : 'text-slate-900')} title={value}>
          {value}
        </dd>
      </div>
    </div>
  )
}

export function PostCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="mt-5 h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
      <Skeleton className="mt-5 h-16 w-full rounded-xl" />
    </Card>
  )
}

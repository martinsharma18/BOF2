import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ClipboardList, Download, Hand, ImageIcon, Link2, ListChecks, MapPin, MessageCircle, MoreHorizontal, Pencil, Phone, Send, Tag, Trash2, UserCheck, Users, VenusAndMars, Wallet } from 'lucide-react'
import { Avatar, Badge, Button, ButtonLink, Card, ConfirmDialog, Dialog, Menu, MenuItem, MenuSeparator, Skeleton, Spinner, Textarea, toast } from '@/components/ui'
import { useApply } from '@/features/applications/api'
import { ClaimPaymentDialog } from '@/features/applications/ClaimPaymentDialog'
import { JobProgress } from '@/features/applications/JobProgress'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage, getProblem } from '@/lib/api'
import { cn } from '@/lib/cn'
import { downloadFile, toFileName } from '@/lib/download'
import { formatMoney, pluralize, timeAgo } from '@/lib/format'
import type { Post } from '@/lib/types'
import { useDeletePost } from './api'
import { FeedbackSection } from './FeedbackSection'
import { genderLabel, locationLabel, postOptionLabel, postTypeLabel } from './labels'
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
  // Type 2 posts show a short requirement: area, amount and contacts only, photo always on the left.
  const isCompact = post.type === 'Type2'
  const postUrl = `/posts/${post.id}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(postUrl, window.location.origin).toString())
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  const [downloading, setDownloading] = useState(false)
  const downloadPhoto = async () => {
    if (!post.mediaUrl) return
    setDownloading(true)
    try {
      await downloadFile(post.mediaUrl, toFileName(post.title))
    } catch {
      toast.error('Could not download the photo')
    } finally {
      setDownloading(false)
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
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge tone="brand">{postTypeLabel(post.type)}</Badge>
          {post.option && <Badge tone="amber">{postOptionLabel(post.option)}</Badge>}
        </div>
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
          {post.mediaUrl && (
            <MenuItem icon={<Download className="size-4" />} onClick={downloadPhoto}>
              Download photo
            </MenuItem>
          )}
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

      {/* Photo on the left, the requirement (the decision criteria) on the right. */}
      <div className={cn('mx-4 mt-4 grid gap-3 sm:mx-5', isCompact ? 'grid-cols-2' : 'sm:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]')}>
        {post.mediaUrl ? (
          <div className="group relative overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
            <img src={post.mediaUrl} alt="" loading="lazy" className="h-full max-h-72 min-h-40 w-full object-cover" />
            <button
              type="button"
              onClick={downloadPhoto}
              disabled={downloading}
              aria-label="Download photo"
              title="Download photo"
              className="absolute right-2 bottom-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900/70 px-3 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-slate-900/85 disabled:opacity-60"
            >
              {downloading ? <Spinner className="size-4" /> : <Download className="size-4" />}
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 text-sm font-medium text-brand-700">
            <ImageIcon className="size-6 text-brand-300" aria-hidden />
            No photo
          </div>
        )}
        <div className="flex flex-col">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-brand-700">
            <ListChecks className="size-4" aria-hidden />
            Requirement
          </h3>
          <dl className={cn('grid flex-1 gap-px overflow-hidden rounded-xl bg-slate-200/70 ring-1 ring-slate-200/70', isCompact ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-1')}>
          {post.option && !isCompact && <Detail icon={<Tag className="size-4" />} label="Option" value={postOptionLabel(post.option)} />}
          {!isCompact && <Detail icon={<Users className="size-4" />} label="Minimum people" value={`${post.minimumNumber}+`} />}
          {isCompact && <Detail icon={<MapPin className="size-4" />} label="Area" value={locationLabel(post)} />}
          <Detail icon={<Wallet className="size-4" />} label="Maximum payment" value={formatMoney(post.maximumPayment)} highlight />
          {!isCompact && <Detail icon={<VenusAndMars className="size-4" />} label="Gender" value={genderLabel(post)} />}
          {!isCompact && <Detail icon={<MapPin className="size-4" />} label="Area" value={locationLabel(post)} />}
          {post.contactNumber && (
            <Detail icon={<Phone className="size-4" />} label="Contact" value={post.contactNumber} href={`tel:${post.contactNumber.replace(/[\s-]/g, '')}`} />
          )}
          {post.witnessContactNumber && (
            <Detail icon={<UserCheck className="size-4" />} label="Witness contact" value={post.witnessContactNumber} />
          )}
          </dl>
        </div>
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
        title={`Apply: ${post.title}`}
        description={<>Your message and <Link className="font-semibold text-brand-600 hover:underline" to={`/u/${user?.id}`}>profile</Link> (with your phone number) go to {post.author.displayName}.</>}
        footer={<><Button variant="secondary" onClick={() => setApplyOpen(false)}>Cancel</Button><Button icon={<Send className="size-4" />} loading={apply.isPending} disabled={!applicationMessage.trim()} onClick={submitApplication}>Send application</Button></>}
      >
        <div className="space-y-4">
          {/* The job at a glance, so people know what they're applying for. */}
          <dl className={cn('grid gap-px overflow-hidden rounded-xl bg-slate-200/70 text-center ring-1 ring-slate-200/70', isCompact ? 'grid-cols-2' : 'grid-cols-3')}>
            {[
              { label: 'Pays up to', value: post.maximumPayment > 0 ? formatMoney(post.maximumPayment) : 'Not set' },
              ...(isCompact ? [] : [{ label: 'People needed', value: `${post.minimumNumber}+` }]),
              { label: 'Area', value: locationLabel(post) },
            ].map((d) => (
              <div key={d.label} className="bg-slate-50 px-2 py-2">
                <dt className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">{d.label}</dt>
                <dd className="truncate text-sm font-semibold text-slate-900" title={d.value}>{d.value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <label htmlFor={`application-${post.id}`} className="mb-2 block text-sm font-medium text-slate-700">A short message for the company</label>
            <Textarea id={`application-${post.id}`} rows={4} maxLength={1500} placeholder="Introduce yourself: your experience, when you can start, and why you're a good fit…" value={applicationMessage} onChange={(event) => setApplicationMessage(event.target.value)} />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500">Quick start:</span>
              {['I can start right away.', 'I have done this kind of work before.', 'I live nearby and can travel easily.'].map((line) => (
                <button
                  key={line}
                  type="button"
                  onClick={() => setApplicationMessage((m) => (m.includes(line) ? m : `${m.trim()} ${line}`.trim()))}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                >
                  + {line}
                </button>
              ))}
              <span className="ml-auto text-xs text-slate-400 tabular-nums">{applicationMessage.length}/1500</span>
            </div>
          </div>

          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900">
            <b>What happens next:</b> the company reviews and hires → you do the work → you claim your payment → they pay into your wallet.
          </p>
        </div>
      </Dialog>
    </Card>
  )
}

/**
 * Apply and Claim for individuals. One application is one job with one payment:
 * Apply → the company hires you → Claim your payment (once) → the company pays → done.
 */
function ApplicantActions({ post, onApply }: { post: Post; onApply: () => void }) {
  const [claimOpen, setClaimOpen] = useState(false)
  const mine = post.myApplication
  const claimed = mine?.claimedAmount != null
  const canClaim = mine?.status === 'Accepted' && !claimed

  // One plain sentence telling the person exactly where they are and what happens next.
  let hint: { text: string; tone: 'slate' | 'brand' | 'amber' | 'green' | 'red' }
  if (!mine) hint = { text: 'Step 1: apply. Claim unlocks after the company hires you.', tone: 'slate' }
  else if (mine.status === 'Pending') hint = { text: 'Applied. Waiting for the company to hire you.', tone: 'amber' }
  else if (mine.status === 'Rejected') hint = { text: 'The company chose someone else for this job.', tone: 'red' }
  else if (mine.status === 'Completed') hint = { text: `Paid ${formatMoney(mine.paidAmount)}. The money is in your wallet.`, tone: 'green' }
  else if (claimed) hint = { text: `You claimed ${formatMoney(mine.claimedAmount!)}. Waiting for the company to pay.`, tone: 'amber' }
  else if (mine.claimDeclineReason) hint = { text: `Claim declined: “${mine.claimDeclineReason}” Fix it and claim again.`, tone: 'red' }
  else hint = { text: 'You’re hired! When the work is done, tap Claim to get paid.', tone: 'brand' }

  const hintColors = {
    slate: 'bg-slate-50 text-slate-600 ring-slate-200',
    brand: 'bg-brand-50 text-brand-800 ring-brand-200',
    amber: 'bg-amber-50 text-amber-800 ring-amber-200',
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
  }

  return (
    <div className="mx-4 mt-4 sm:mx-5">
      <div className="flex gap-2">
        <Button
          className="flex-1"
          variant={mine ? 'secondary' : 'primary'}
          icon={mine ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Send className="size-4" />}
          disabled={!!mine}
          onClick={onApply}
        >
          {mine ? 'Applied' : 'Apply'}
        </Button>
        <Button
          variant={canClaim ? 'accent' : 'secondary'}
          className="flex-1"
          icon={mine?.status === 'Completed' || claimed ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Hand className="size-4" />}
          disabled={!canClaim}
          onClick={() => setClaimOpen(true)}
        >
          {mine?.status === 'Completed' ? 'Paid' : claimed ? 'Claimed' : mine?.claimDeclineReason ? 'Claim again' : 'Claim payment'}
        </Button>
      </div>

      {mine && mine.status !== 'Rejected' && (
        <Link to={`/applications?id=${mine.id}`} className="mt-3 block rounded-xl px-1 py-1 hover:bg-slate-50" aria-label="Open this application">
          <JobProgress status={mine.status} claimed={claimed} />
        </Link>
      )}
      <p className={cn('mt-2 rounded-lg px-3 py-2 text-xs font-medium ring-1', hintColors[hint.tone])}>{hint.text}</p>

      {mine && canClaim && (
        <ClaimPaymentDialog
          applicationId={mine.id}
          companyName={post.author.displayName}
          maxAmount={post.maximumPayment}
          declineReason={mine.claimDeclineReason}
          open={claimOpen}
          onClose={() => setClaimOpen(false)}
        />
      )}
    </div>
  )
}

function Detail({ icon, label, value, highlight, href }: { icon: ReactNode; label: string; value: string; highlight?: boolean; href?: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-slate-50 px-3 py-2.5">
      <span className={cn('mt-0.5', highlight ? 'text-accent-500' : 'text-brand-500')} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
        <dd className={cn('truncate text-sm font-semibold', highlight ? 'text-accent-700' : 'text-slate-900')} title={value}>
          {href ? (
            <a href={href} className="text-brand-700 hover:underline">
              {value}
            </a>
          ) : (
            value
          )}
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

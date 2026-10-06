import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, BriefcaseBusiness, Check, CircleAlert, Clock, Hand, MessageSquare, Paperclip, Phone, UserPlus, X, XCircle } from 'lucide-react'
import { Avatar, Badge, Button, ButtonLink, buttonClasses, Card, ConfirmDialog, Dialog, Field, Input, Textarea, toast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { postTypeHasPayments } from '@/features/posts/labels'
import { getErrorMessage, getProblem } from '@/lib/api'
import { cn } from '@/lib/cn'
import { ageFrom, formatMoney, timeAgo } from '@/lib/format'
import type { Application } from '@/lib/types'
import { useDeclineClaim, usePayApplicant, useSetApplicationStatus } from './api'
import { ClaimPaymentDialog } from './ClaimPaymentDialog'
import { JobProgress } from './JobProgress'
import { stageMeta, stageOf, type Tone } from './labels'

/**
 * One application = one job = one payment: Applied → Hired → Claimed → Paid.
 * The card answers three things at a glance: who / which job, where it stands, and what to do next.
 * Talking happens in Messages (one conversation per application); the card links there.
 */
export function ApplicationCard({ application, highlighted }: { application: Application; highlighted?: boolean }) {
  const { user } = useAuth()
  const a = application
  const isCompany = user?.id === a.company.id
  const stage = stageOf(a)
  const phone = isCompany ? a.applicant.phoneNumber : null

  return (
    <Card className={cn('animate-fade-in overflow-hidden', highlighted && 'ring-2 ring-accent-400')}>
      <div className="space-y-3 p-4">
        {isCompany ? <ApplicantHeader application={a} /> : <JobHeader application={a} />}

        {stage !== 'Declined' && <JobProgress status={a.status} claimed={stage === 'Claimed'} payments={postTypeHasPayments(a.postType)} />}

        <NextStep application={a} isCompany={isCompany} />

        {/* A new applicant's note is what the company decides on, so show it right away. */}
        {isCompany && stage === 'New' && a.message && (
          <p className="line-clamp-3 border-l-2 border-slate-200 pl-3 text-sm whitespace-pre-line text-slate-600">{a.message}</p>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-slate-100 px-2 py-2 sm:px-3">
        <ButtonLink to={`/messages/${a.id}`} variant="ghost" size="sm" icon={<MessageSquare className="size-4" />}>
          Chat{a.messageCount > 0 && <span className="text-slate-400">{a.messageCount}</span>}
        </ButtonLink>
        {phone && (
          <a href={`tel:${phone}`} className={buttonClasses({ variant: 'ghost', size: 'sm' })} aria-label={`Call ${a.applicant.fullName}`}>
            <Phone className="size-4" />
            <span className="max-sm:hidden">Call</span>
          </a>
        )}
        <div className="ml-auto flex items-center gap-2">
          <JobActions application={a} />
        </div>
      </div>
    </Card>
  )
}

/** Company view: the person first (name, age, gender, place), the job as a small line under it. */
function ApplicantHeader({ application: a }: { application: Application }) {
  const p = a.applicant
  const stage = stageOf(a)
  const facts = [p.dateOfBirth && `${ageFrom(p.dateOfBirth)} yrs`, p.gender, p.district ?? p.province].filter(Boolean)

  return (
    <div className="flex items-start gap-3">
      <Link to={`/u/${p.id}`} className="shrink-0">
        <Avatar name={p.fullName} src={p.avatarUrl} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/u/${p.id}`} className="truncate font-semibold text-slate-900 hover:underline">
            {p.fullName}
          </Link>
          <Badge tone={stageMeta[stage].tone} className="shrink-0">
            {stageMeta[stage].company}
          </Badge>
        </div>
        {facts.length > 0 && <p className="text-sm text-slate-500">{facts.join(' · ')}</p>}
        <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-slate-400">
          <BriefcaseBusiness className="size-3 shrink-0" />
          <Link to={`/posts/${a.postId}`} className="truncate hover:text-brand-700 hover:underline">
            {a.postTitle}
          </Link>
          <span className="shrink-0">· {timeAgo(a.createdAt)}</span>
        </p>
      </div>
    </div>
  )
}

/** Individual view: the job first, then who posted it and the pay. */
function JobHeader({ application: a }: { application: Application }) {
  const stage = stageOf(a)
  return (
    <div className="flex items-start gap-3">
      <Link to={`/u/${a.company.id}`} className="shrink-0">
        <Avatar name={a.company.displayName} src={a.company.avatarUrl} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/posts/${a.postId}`} className="truncate font-semibold text-slate-900 hover:underline">
            {a.postTitle}
          </Link>
          <Badge tone={stageMeta[stage].tone} className="shrink-0">
            {stageMeta[stage].individual}
          </Badge>
        </div>
        <p className="truncate text-sm text-slate-500">
          {a.company.displayName}
          {a.postMaximumPayment > 0 && <> · up to {formatMoney(a.postMaximumPayment)}</>}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">Applied {timeAgo(a.createdAt)}</p>
      </div>
    </div>
  )
}

const toneText: Record<Tone, string> = {
  brand: 'text-brand-700 [&_svg]:text-brand-500',
  green: 'text-emerald-700 [&_svg]:text-emerald-500',
  amber: 'text-amber-800 [&_svg]:text-amber-500',
  red: 'text-red-700 [&_svg]:text-red-500',
  slate: 'text-slate-600 [&_svg]:text-slate-400',
}

/** One plain sentence: where the job is and what happens next, worded for whoever is looking. */
function NextStep({ application: a, isCompany }: { application: Application; isCompany: boolean }) {
  const stage = stageOf(a)
  const company = a.company.displayName
  let step: { tone: Tone; icon: ReactNode; text: ReactNode }

  if (stage === 'New')
    step = isCompany
      ? { tone: 'brand', icon: <UserPlus />, text: 'New applicant. Read their note, then hire or decline.' }
      : { tone: 'brand', icon: <Clock />, text: `Waiting for ${company} to reply.` }
  else if (stage === 'Hired' && a.claimDeclineReason)
    step = isCompany
      ? { tone: 'red', icon: <CircleAlert />, text: <>You declined the claim: “{a.claimDeclineReason}”</> }
      : { tone: 'red', icon: <CircleAlert />, text: <>Claim declined: “{a.claimDeclineReason}”. Fix it and claim again.</> }
  else if (stage === 'Hired' && !postTypeHasPayments(a.postType))
    step = isCompany
      ? { tone: 'green', icon: <BriefcaseBusiness />, text: 'Hired. Use the chat to agree on the details.' }
      : { tone: 'green', icon: <BriefcaseBusiness />, text: 'You’re hired! Use the chat to agree on the details.' }
  else if (stage === 'Hired')
    step = isCompany
      ? { tone: 'green', icon: <BriefcaseBusiness />, text: 'Working. They claim payment when the work is done.' }
      : { tone: 'green', icon: <BriefcaseBusiness />, text: 'You’re hired! Claim payment when the work is done.' }
  else if (stage === 'Claimed')
    step = isCompany
      ? { tone: 'amber', icon: <Hand />, text: <>Claimed {formatMoney(a.claimedAmount!)}{a.claimNote && <> · “{a.claimNote}”</>}. Pay or decline.<ClaimProofLink application={a} /></> }
      : { tone: 'amber', icon: <Hand />, text: <>You claimed {formatMoney(a.claimedAmount!)}. Waiting for payment.<ClaimProofLink application={a} /></> }
  else if (stage === 'Paid')
    step = isCompany
      ? { tone: 'green', icon: <Banknote />, text: `Paid ${formatMoney(a.paidAmount)}. Job closed.` }
      : { tone: 'green', icon: <Banknote />, text: `${formatMoney(a.paidAmount)} is in your wallet.` }
  else
    step = isCompany
      ? { tone: 'slate', icon: <XCircle />, text: 'You declined this application.' }
      : { tone: 'slate', icon: <XCircle />, text: 'Not selected this time. Keep applying!' }

  return (
    <p className={cn('flex items-start gap-2 text-sm font-medium [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0', toneText[step.tone])}>
      {step.icon}
      <span className="min-w-0">{step.text}</span>
    </p>
  )
}

/** The photo or PDF sent with the claim, opened in a new tab. */
function ClaimProofLink({ application: a }: { application: Application }) {
  if (!a.claimAttachmentUrl) return null
  return (
    <a
      href={a.claimAttachmentUrl}
      target="_blank"
      rel="noreferrer"
      className="mt-1 flex w-fit max-w-full items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50"
    >
      <Paperclip className="mt-0! size-3.5!" aria-hidden />
      <span className="truncate">{a.claimAttachmentName ?? 'Proof of work'}</span>
    </a>
  )
}

/**
 * The next step for whoever is looking: Hire/Decline, Pay/Decline claim, Claim payment…
 * Used on the application card and at the top of the chat, so the job can move on from either place.
 */
export function JobActions({ application: a }: { application: Application }) {
  const { user } = useAuth()
  const [dialog, setDialog] = useState<'pay' | 'decline-claim' | 'claim' | 'hire' | 'decline' | 'cancel-hire' | null>(null)
  const setStatus = useSetApplicationStatus()
  const isCompany = user?.id === a.company.id
  const stage = stageOf(a)
  const name = a.applicant.fullName
  const payments = postTypeHasPayments(a.postType)

  // Hiring and declining notify the other person, so ask first.
  const changeStatus = (to: 'Accepted' | 'Rejected') =>
    setStatus.mutate(
      { id: a.id, status: to },
      {
        onSuccess: () => {
          setDialog(null)
          toast.success(to === 'Accepted' ? `${name} is hired and was notified.` : 'Done. They were notified.')
        },
        onError: (error) => toast.error(getProblem(error)?.errors?.Status?.[0] ?? getErrorMessage(error)),
      },
    )
  const confirm = {
    hire: {
      title: `Hire ${name}?`,
      description: payments
        ? `${name} will be notified and can start the work. When it's done they claim payment, and you pay from here.`
        : `${name} will be notified. Use the chat to agree on the details.`,
      label: 'Yes, hire',
      to: 'Accepted' as const,
    },
    decline: {
      title: `Decline ${name}?`,
      description: 'They will be told you chose someone else. You can still hire them later.',
      label: 'Decline',
      to: 'Rejected' as const,
    },
    'cancel-hire': {
      title: `Cancel hiring ${name}?`,
      description: 'They will be told the job is off. You can hire them again later.',
      label: 'Cancel hire',
      to: 'Rejected' as const,
    },
  }
  const asking = dialog === 'hire' || dialog === 'decline' || dialog === 'cancel-hire' ? confirm[dialog] : null

  return (
    <>
      {isCompany && stage === 'New' && (
        <>
          <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={() => setDialog('decline')}>
            Decline
          </Button>
          <Button size="sm" icon={<Check className="size-4" />} onClick={() => setDialog('hire')}>
            Hire
          </Button>
        </>
      )}
      {isCompany && stage === 'Declined' && (
        <Button variant="secondary" size="sm" icon={<Check className="size-4" />} onClick={() => setDialog('hire')}>
          Hire anyway
        </Button>
      )}
      {isCompany && stage === 'Hired' && (
        <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={() => setDialog('cancel-hire')}>
          Cancel hire
        </Button>
      )}
      {isCompany && stage === 'Claimed' && (
        <>
          <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={() => setDialog('decline-claim')}>
            Decline claim
          </Button>
          <Button variant="accent" size="sm" icon={<Banknote className="size-4" />} onClick={() => setDialog('pay')}>
            Pay {formatMoney(a.claimedAmount!)}
          </Button>
        </>
      )}

      {!isCompany && stage === 'Hired' && payments && (
        <Button variant="accent" size="sm" icon={<Hand className="size-4" />} onClick={() => setDialog('claim')}>
          {a.claimDeclineReason ? 'Claim again' : 'Claim payment'}
        </Button>
      )}
      {!isCompany && stage === 'Paid' && (
        <ButtonLink to="/wallet" variant="soft" size="sm" icon={<Banknote className="size-4" />}>
          Open wallet
        </ButtonLink>
      )}
      {!isCompany && stage === 'Declined' && (
        <ButtonLink to="/feed" variant="secondary" size="sm">
          Find other jobs
        </ButtonLink>
      )}

      <ConfirmDialog
        open={!!asking}
        onClose={() => setDialog(null)}
        onConfirm={() => asking && changeStatus(asking.to)}
        title={asking?.title ?? ''}
        description={asking?.description}
        confirmLabel={asking?.label}
        danger={asking?.to === 'Rejected'}
        loading={setStatus.isPending}
      />
      {dialog === 'pay' && <PayDialog application={a} onClose={() => setDialog(null)} />}
      {dialog === 'decline-claim' && <DeclineClaimDialog application={a} onClose={() => setDialog(null)} />}
      {payments && (
        <ClaimPaymentDialog
          applicationId={a.id}
          companyName={a.company.displayName}
          maxAmount={a.postMaximumPayment}
          declineReason={a.claimDeclineReason}
          open={dialog === 'claim'}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}

/** Pays exactly the claimed amount. To pay something else, decline the claim and say why. */
function PayDialog({ application, onClose }: { application: Application; onClose: () => void }) {
  const pay = usePayApplicant()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const amount = application.claimedAmount ?? 0

  const submit = () => {
    setError(undefined)
    pay.mutate(
      { id: application.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`${formatMoney(amount)} sent to ${application.applicant.fullName}'s wallet`)
          onClose()
        },
        onError: (e) => setError(getProblem(e)?.errors?.Amount?.[0] ?? getErrorMessage(e)),
      },
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={`Pay ${formatMoney(amount)} to ${application.applicant.fullName}?`}
      description="This is the amount they claimed. It goes to their wallet and the job closes. You can't undo it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" loading={pay.isPending} onClick={submit}>
            Pay {formatMoney(amount)}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        <Field label="Note" htmlFor={`pay-note-${application.id}`} optional hint="Shown in their wallet.">
          <Input id={`pay-note-${application.id}`} maxLength={200} placeholder="e.g. Thanks for 3 days of work" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <p className="text-xs text-slate-500">Amount wrong or work not finished? Cancel and use “Decline claim” to tell them why.</p>
      </div>
    </Dialog>
  )
}

function DeclineClaimDialog({ application, onClose }: { application: Application; onClose: () => void }) {
  const decline = useDeclineClaim()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()

  const submit = () => {
    setError(undefined)
    decline.mutate(
      { id: application.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(`Claim declined. ${application.applicant.fullName} was told why and can claim again.`)
          onClose()
        },
        onError: (e) => setError(getProblem(e)?.errors?.Reason?.[0] ?? getErrorMessage(e)),
      },
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Decline this claim?"
      description={`${application.applicant.fullName} stays hired and can send a corrected claim.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={decline.isPending} disabled={!reason.trim()} onClick={submit}>
            Decline claim
          </Button>
        </>
      }
    >
      <Field label="Reason" htmlFor={`decline-${application.id}`} error={error}>
        <Textarea
          id={`decline-${application.id}`}
          rows={3}
          maxLength={300}
          placeholder="e.g. We agreed Rs. 3,000 for 2 days, please claim that amount"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
    </Dialog>
  )
}

import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  ExternalLink,
  Hand,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  UserPlus,
  UserRound,
  X,
  XCircle,
} from 'lucide-react'
import { Avatar, Badge, Button, ButtonLink, Card, Dialog, Field, Input, Textarea, toast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage, getProblem } from '@/lib/api'
import { cn } from '@/lib/cn'
import { ageFrom, formatMoney, timeAgo } from '@/lib/format'
import type { Application } from '@/lib/types'
import { useDeclineClaim, usePayApplicant, useSetApplicationStatus } from './api'
import { ClaimPaymentDialog } from './ClaimPaymentDialog'
import { ConversationDialog } from './ConversationDialog'
import { JobProgress } from './JobProgress'
import { stageMeta, stageOf, type Tone } from './labels'

/**
 * One application = one job = one payment.
 * Applied → company Hires → applicant Claims (amount + what they did) → company Pays that exact amount → Paid (closed).
 * The company can decline the claim with a reason; the applicant then fixes it and claims again.
 */
export function ApplicationCard({ application, highlighted, autoOpenChat }: { application: Application; highlighted?: boolean; autoOpenChat?: boolean }) {
  const { user } = useAuth()
  const [chatOpen, setChatOpen] = useState(!!autoOpenChat)
  const [dialog, setDialog] = useState<'pay' | 'decline-claim' | 'claim' | null>(null)
  const setStatus = useSetApplicationStatus()

  const a = application
  const isCompany = user?.id === a.company.id
  const stage = stageOf(a)
  const badge = stageMeta[stage]
  const other = isCompany
    ? { id: a.applicant.id, name: a.applicant.fullName, avatar: a.applicant.avatarUrl }
    : { id: a.company.id, name: a.company.displayName, avatar: a.company.avatarUrl }

  const changeStatus = (to: 'Accepted' | 'Rejected') =>
    setStatus.mutate(
      { id: a.id, status: to },
      {
        onSuccess: () => toast.success(to === 'Accepted' ? `${a.applicant.fullName} is hired and was notified.` : 'Done. They were notified.'),
        onError: (error) => toast.error(getProblem(error)?.errors?.Status?.[0] ?? getErrorMessage(error)),
      },
    )
  const busy = (to: 'Accepted' | 'Rejected') => setStatus.isPending && setStatus.variables?.status === to

  return (
    <Card className={cn('animate-fade-in overflow-hidden', highlighted && 'ring-2 ring-accent-400')}>
      <div className="space-y-4 p-4 sm:p-5">
        {/* Who + which job */}
        <div className="flex items-start gap-3">
          <Link to={`/u/${other.id}`} className="shrink-0">
            <Avatar name={other.name} src={other.avatar} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link to={`/u/${other.id}`} className="truncate font-semibold text-slate-900 hover:underline">
                {other.name}
              </Link>
              <Badge tone={badge.tone}>{isCompany ? badge.company : badge.individual}</Badge>
            </div>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              <Link to={`/posts/${a.postId}`} className="font-medium text-slate-700 hover:text-brand-700 hover:underline">
                {a.postTitle}
              </Link>
              {a.postMaximumPayment > 0 && <> · up to {formatMoney(a.postMaximumPayment)}</>}
              <> · applied {timeAgo(a.createdAt)}</>
            </p>
          </div>
        </div>

        {stage !== 'Declined' && <JobProgress status={a.status} claimed={stage === 'Claimed'} />}

        <StatusPanel application={a} isCompany={isCompany} />

        <Details application={a} isCompany={isCompany} defaultOpen={isCompany && stage === 'New'} />
      </div>

      {/* Actions: chat on the left, the one thing to do next on the right. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
        <Button variant="secondary" size="sm" icon={<MessageSquare className="size-4" />} onClick={() => setChatOpen(true)}>
          Chat{a.messageCount > 0 && ` (${a.messageCount})`}
        </Button>
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          {isCompany && stage === 'New' && (
            <>
              <Button variant="ghost" size="sm" icon={<X className="size-4" />} loading={busy('Rejected')} onClick={() => changeStatus('Rejected')}>
                Decline
              </Button>
              <Button size="sm" icon={<Check className="size-4" />} loading={busy('Accepted')} onClick={() => changeStatus('Accepted')}>
                Hire
              </Button>
            </>
          )}
          {isCompany && stage === 'Declined' && (
            <Button variant="secondary" size="sm" icon={<Check className="size-4" />} loading={busy('Accepted')} onClick={() => changeStatus('Accepted')}>
              Hire anyway
            </Button>
          )}
          {isCompany && stage === 'Hired' && (
            <Button variant="ghost" size="sm" icon={<X className="size-4" />} loading={busy('Rejected')} onClick={() => changeStatus('Rejected')}>
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

          {!isCompany && stage === 'Hired' && (
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
        </div>
      </div>

      <ConversationDialog application={a} open={chatOpen} onClose={() => setChatOpen(false)} />
      {dialog === 'pay' && <PayDialog application={a} onClose={() => setDialog(null)} />}
      {dialog === 'decline-claim' && <DeclineClaimDialog application={a} onClose={() => setDialog(null)} />}
      <ClaimPaymentDialog
        applicationId={a.id}
        companyName={a.company.displayName}
        maxAmount={a.postMaximumPayment}
        declineReason={a.claimDeclineReason}
        open={dialog === 'claim'}
        onClose={() => setDialog(null)}
      />
    </Card>
  )
}

const panelTones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-900 ring-brand-200 [&_svg]:text-brand-600',
  green: 'bg-emerald-50 text-emerald-900 ring-emerald-200 [&_svg]:text-emerald-600',
  amber: 'bg-amber-50 text-amber-900 ring-amber-200 [&_svg]:text-amber-600',
  red: 'bg-red-50 text-red-900 ring-red-200 [&_svg]:text-red-600',
  slate: 'bg-slate-50 text-slate-700 ring-slate-200 [&_svg]:text-slate-500',
}

/** One box that says where the job is and what happens next, worded for whoever is looking. */
function StatusPanel({ application: a, isCompany }: { application: Application; isCompany: boolean }) {
  const stage = stageOf(a)
  const person = a.applicant.fullName
  const company = a.company.displayName
  let panel: { tone: Tone; icon: ReactNode; title: string; text?: ReactNode }

  if (stage === 'New')
    panel = isCompany
      ? { tone: 'brand', icon: <UserPlus />, title: 'New applicant', text: `Read ${person}'s message and profile below, then hire or decline.` }
      : { tone: 'brand', icon: <Clock />, title: 'Application sent', text: `Waiting for ${company} to reply. You'll get a notification.` }
  else if (stage === 'Hired' && a.claimDeclineReason)
    panel = isCompany
      ? { tone: 'red', icon: <CircleAlert />, title: 'You declined the last claim', text: <>“{a.claimDeclineReason}” Waiting for a corrected claim.</> }
      : { tone: 'red', icon: <CircleAlert />, title: `${company} declined your claim`, text: <>“{a.claimDeclineReason}” Fix it and tap Claim again.</> }
  else if (stage === 'Hired')
    panel = isCompany
      ? { tone: 'green', icon: <BriefcaseBusiness />, title: `${person} is working on this job`, text: 'When the work is done they claim payment, and you pay from here.' }
      : {
          tone: 'green',
          icon: <BriefcaseBusiness />,
          title: "You're hired!",
          text: `Do the work, then tap Claim payment${a.postMaximumPayment > 0 ? ` (up to ${formatMoney(a.postMaximumPayment)})` : ''}.`,
        }
  else if (stage === 'Claimed')
    panel = {
      tone: 'amber',
      icon: <Hand />,
      title: `${isCompany ? `${person} claimed` : 'You claimed'} ${formatMoney(a.claimedAmount!)}`,
      text: (
        <>
          {a.claimNote && <span className="block">“{a.claimNote}”</span>}
          {isCompany ? 'Check the work, then pay this amount or decline the claim with a reason.' : `Waiting for ${company} to pay. You'll get a notification.`}
        </>
      ),
    }
  else if (stage === 'Paid')
    panel = isCompany
      ? { tone: 'green', icon: <Banknote />, title: `Paid ${formatMoney(a.paidAmount)}`, text: 'This job is closed.' }
      : { tone: 'green', icon: <Banknote />, title: `${formatMoney(a.paidAmount)} is in your wallet`, text: 'Cash it out whenever you like.' }
  else
    panel = isCompany
      ? { tone: 'slate', icon: <XCircle />, title: 'You declined this application', text: 'You can still hire them if you change your mind.' }
      : { tone: 'slate', icon: <XCircle />, title: 'Not selected this time', text: `${company} chose someone else. Keep applying to other jobs.` }

  return (
    <div className={cn('flex gap-3 rounded-xl px-4 py-3 text-sm ring-1 [&_svg]:size-5', panelTones[panel.tone])}>
      <span className="mt-0.5 shrink-0" aria-hidden>
        {panel.icon}
      </span>
      <div className="min-w-0">
        <p className="font-semibold">{panel.title}</p>
        {panel.text && <p className="mt-0.5 opacity-90">{panel.text}</p>}
      </div>
    </div>
  )
}

/** The application message (and, for companies, the applicant's contact details). Folded once it's no longer needed. */
function Details({ application: a, isCompany, defaultOpen }: { application: Application; isCompany: boolean; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl ring-1 ring-slate-200/70">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        {isCompany ? 'Message, profile & contact' : 'Your application message'}
        <ChevronDown className={cn('size-4 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          <p className="text-sm whitespace-pre-line text-slate-700">{a.message}</p>
          {isCompany && <ContactList application={a} />}
        </div>
      )}
    </div>
  )
}

/** What the company sees about the person who applied. */
function ContactList({ application }: { application: Application }) {
  const p = application.applicant
  return (
    <div>
      {p.bio && <p className="mb-2 text-sm text-slate-500 italic">{p.bio}</p>}
      <ul className="grid gap-x-4 gap-y-1.5 text-sm text-slate-600 sm:grid-cols-2">
        {p.gender && (
          <Info icon={<UserRound className="size-3.5" />}>
            {p.gender}
            {p.dateOfBirth && ` · ${ageFrom(p.dateOfBirth)} years`}
          </Info>
        )}
        {p.province && <Info icon={<MapPin className="size-3.5" />}>{[p.localLevel, p.district, p.province].filter(Boolean).join(', ')}</Info>}
        {p.phoneNumber && (
          <Info icon={<Phone className="size-3.5" />}>
            <a href={`tel:${p.phoneNumber}`} className="hover:text-brand-700 hover:underline">
              {p.phoneNumber}
            </a>
            {p.additionalPhoneNumber && `, ${p.additionalPhoneNumber}`}
          </Info>
        )}
        {p.email && (
          <Info icon={<Mail className="size-3.5" />}>
            <a href={`mailto:${p.email}`} className="truncate hover:text-brand-700 hover:underline">
              {p.email}
            </a>
          </Info>
        )}
        {p.socialMediaLink && (
          <Info icon={<ExternalLink className="size-3.5" />}>
            <a href={p.socialMediaLink} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 hover:underline">
              Social profile
            </a>
          </Info>
        )}
        <Info icon={<UserRound className="size-3.5" />}>
          <Link to={`/u/${p.id}`} className="font-medium text-brand-600 hover:underline">
            Full profile
          </Link>
        </Info>
      </ul>
    </div>
  )
}

function Info({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-slate-400" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </li>
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

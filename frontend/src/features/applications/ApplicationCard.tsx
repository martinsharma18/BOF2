import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Check, ExternalLink, Hand, Mail, MapPin, MessageSquare, Phone, UserRound, X } from 'lucide-react'
import { Avatar, Badge, Button, Card, Dialog, Field, Input, toast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage, getProblem } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatMoney, timeAgo } from '@/lib/format'
import type { Application } from '@/lib/types'
import { usePayApplicant, useSetApplicationStatus } from './api'
import { ClaimPaymentDialog } from './ClaimPaymentDialog'
import { ConversationDialog } from './ConversationDialog'
import { applicationStatusMeta } from './labels'

export function ApplicationCard({ application, highlighted, autoOpenChat }: { application: Application; highlighted?: boolean; autoOpenChat?: boolean }) {
  const { user } = useAuth()
  const [chatOpen, setChatOpen] = useState(!!autoOpenChat)
  const [payOpen, setPayOpen] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const setStatus = useSetApplicationStatus()

  const isCompany = user?.id === application.company.id
  const a = application
  const status = applicationStatusMeta[a.status]

  const changeStatus = (next: 'Accepted' | 'Rejected') =>
    setStatus.mutate(
      { id: a.id, status: next },
      {
        onSuccess: () => toast.success(next === 'Accepted' ? 'Application accepted. The applicant was notified.' : 'Application declined'),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )

  return (
    <Card className={cn('animate-fade-in p-4 sm:p-5', highlighted && 'ring-2 ring-accent-400')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/posts/${a.postId}`} className="block truncate font-semibold text-slate-900 hover:text-brand-700">
            {a.postTitle}
          </Link>
          <p className="mt-0.5 text-xs text-slate-500">
            {isCompany ? 'Applied' : `To ${a.company.displayName}`} · {timeAgo(a.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {a.claimedAmount !== null && (
            <Badge tone="amber">
              <Hand className="size-3" /> Payment claimed
            </Badge>
          )}
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>

      {isCompany && <ApplicantProfile application={a} />}

      <blockquote className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm whitespace-pre-line text-slate-700 ring-1 ring-slate-200/70">
        {a.message}
      </blockquote>

      {a.claimedAmount !== null && (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-900 ring-1 ring-accent-200">
          <Hand className="mt-0.5 size-4 shrink-0 text-accent-600" aria-hidden />
          <div>
            <p className="font-semibold">
              {isCompany ? `${a.applicant.fullName} claimed` : 'You claimed'} {formatMoney(a.claimedAmount)}
              {a.claimedAt && <span className="font-normal text-accent-700"> · {timeAgo(a.claimedAt)}</span>}
            </p>
            {a.claimNote && <p className="mt-0.5 text-accent-800">{a.claimNote}</p>}
            {!isCompany && <p className="mt-0.5 text-xs text-accent-700">Waiting for the company to pay.</p>}
          </div>
        </div>
      )}

      {a.paidAmount > 0 && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <Banknote className="size-4" /> {formatMoney(a.paidAmount)} {isCompany ? 'paid' : 'received'}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<MessageSquare className="size-4" />} onClick={() => setChatOpen(true)}>
          Message{a.messageCount > 0 && ` (${a.messageCount})`}
        </Button>
        {isCompany && a.status !== 'Accepted' && (
          <Button size="sm" icon={<Check className="size-4" />} loading={setStatus.isPending && setStatus.variables?.status === 'Accepted'} onClick={() => changeStatus('Accepted')}>
            Accept
          </Button>
        )}
        {isCompany && a.status === 'Pending' && (
          <Button variant="ghost" size="sm" icon={<X className="size-4" />} loading={setStatus.isPending && setStatus.variables?.status === 'Rejected'} onClick={() => changeStatus('Rejected')}>
            Decline
          </Button>
        )}
        {isCompany && a.status === 'Accepted' && (
          <Button variant="accent" size="sm" icon={<Banknote className="size-4" />} onClick={() => setPayOpen(true)}>
            {a.claimedAmount !== null ? `Pay claim ${formatMoney(a.claimedAmount)}` : 'Pay applicant'}
          </Button>
        )}
        {!isCompany && a.status === 'Accepted' && a.claimedAmount === null && (
          <Button variant="accent" size="sm" icon={<Hand className="size-4" />} onClick={() => setClaimOpen(true)}>
            Claim payment
          </Button>
        )}
      </div>

      <ConversationDialog application={a} open={chatOpen} onClose={() => setChatOpen(false)} />
      {isCompany && <PayDialog key={a.claimedAmount ?? 'none'} application={a} open={payOpen} onClose={() => setPayOpen(false)} />}
      {!isCompany && a.status === 'Accepted' && (
        <ClaimPaymentDialog
          applicationId={a.id}
          companyName={a.company.displayName}
          suggestedAmount={Math.max(a.postMaximumPayment - a.paidAmount, 0)}
          open={claimOpen}
          onClose={() => setClaimOpen(false)}
        />
      )}
    </Card>
  )
}

/** What the company sees about the person who applied. */
function ApplicantProfile({ application }: { application: Application }) {
  const p = application.applicant
  return (
    <div className="mt-4 flex gap-4 rounded-xl p-3 ring-1 ring-slate-200/70">
      <Link to={`/u/${p.id}`} className="shrink-0">
        <Avatar name={p.fullName} src={p.avatarUrl} size="lg" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/u/${p.id}`} className="font-semibold text-slate-900 hover:underline">
          {p.fullName}
        </Link>
        {p.bio && <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{p.bio}</p>}
        <ul className="mt-2 grid gap-x-4 gap-y-1 text-sm text-slate-600 sm:grid-cols-2">
          {p.gender && <Info icon={<UserRound className="size-3.5" />}>{p.gender}</Info>}
          {p.district && (
            <Info icon={<MapPin className="size-3.5" />}>
              {p.district}, {p.province}
            </Info>
          )}
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
        </ul>
      </div>
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

function PayDialog({ application, open, onClose }: { application: Application; open: boolean; onClose: () => void }) {
  const pay = usePayApplicant()
  const [amount, setAmount] = useState(String(application.claimedAmount ?? (application.postMaximumPayment || '')))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const value = Number(amount)

  const submit = () => {
    setError(undefined)
    pay.mutate(
      { id: application.id, amount: value, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`${formatMoney(value)} sent to ${application.applicant.fullName}'s wallet`)
          onClose()
        },
        onError: (e) => setError(getProblem(e)?.errors?.Amount?.[0] ?? getErrorMessage(e)),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Pay applicant"
      description={`The money goes to ${application.applicant.fullName}'s wallet. They can cash it out through the admin.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" loading={pay.isPending} disabled={!(value > 0)} onClick={submit}>
            Pay {value > 0 ? formatMoney(value) : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Amount (Rs.)" htmlFor={`pay-${application.id}`} error={error}>
          <Input id={`pay-${application.id}`} type="number" min={1} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Note" htmlFor={`pay-note-${application.id}`} optional>
          <Input id={`pay-note-${application.id}`} maxLength={200} placeholder="e.g. Payment for 3 days of work" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  )
}

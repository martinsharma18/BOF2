import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BriefcaseBusiness, ClipboardList, Send } from 'lucide-react'
import { Avatar, Badge, Button, Skeleton, Spinner, Textarea, toast } from '@/components/ui'
import { useApplication, useApplicationMessages, useSendMessage } from '@/features/applications/api'
import { JobActions } from '@/features/applications/ApplicationCard'
import { COMPANY_PAYS_CLAIMS, stageMeta, stageOf, type ApplicationStage } from '@/features/applications/labels'
import { useAuth } from '@/features/auth/AuthContext'
import { postTypeHasPayments } from '@/features/posts/labels'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatMoney, timeAgo } from '@/lib/format'
import type { Application } from '@/lib/types'
import { useMarkChatRead } from './api'

/**
 * One conversation: who you're talking to, where the job stands (with its next action), the messages, and a
 * reply box. It starts with the application message, so the whole story of the job is in one place.
 */
export function ChatThread({ applicationId, onBack }: { applicationId: string; onBack?: () => void }) {
  const { user } = useAuth()
  const application = useApplication(applicationId)
  const messages = useApplicationMessages(applicationId)
  const markRead = useMarkChatRead()
  const endRef = useRef<HTMLDivElement>(null)

  const a = application.data
  const list = messages.data ?? []
  const lastId = list[list.length - 1]?.id

  // Seen everything up to the newest message: clear the badge and jump to the bottom.
  useEffect(() => {
    if (!a) return
    markRead.mutate(applicationId)
    endRef.current?.scrollIntoView({ block: 'end' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, lastId, !!a])

  if (application.isError)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-500">
        {getErrorMessage(application.error)}
        {onBack && (
          <Button variant="secondary" size="sm" onClick={onBack}>
            Back to messages
          </Button>
        )}
      </div>
    )

  const isCompany = !!a && user?.id === a.company.id
  const other = a && (isCompany ? { id: a.applicant.id, name: a.applicant.fullName, avatar: a.applicant.avatarUrl } : { id: a.company.id, name: a.company.displayName, avatar: a.company.avatarUrl })

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex items-center gap-2 border-b border-slate-100 px-2 py-2 sm:px-4">
        {onBack && (
          <Button variant="ghost" size="icon" className="size-10 lg:hidden" onClick={onBack} aria-label="Back to messages">
            <ArrowLeft className="size-5" />
          </Button>
        )}
        {a && other ? (
          <>
            <Link to={`/u/${other.id}`} className="shrink-0">
              <Avatar name={other.name} src={other.avatar} size="sm" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/u/${other.id}`} className="block truncate font-semibold text-slate-900 hover:underline">
                {other.name}
              </Link>
              <Link to={`/posts/${a.postId}`} className="flex items-center gap-1 truncate text-xs text-slate-500 hover:text-brand-700">
                <BriefcaseBusiness className="size-3 shrink-0" />
                <span className="truncate">{a.postTitle}</span>
              </Link>
            </div>
            <Link
              to={`/applications?id=${a.id}`}
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
            >
              <ClipboardList className="size-4" />
              <span className="max-sm:hidden">Job details</span>
            </Link>
          </>
        ) : (
          <div className="flex flex-1 items-center gap-3 px-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
        )}
      </header>

      {/* Where the job stands + the next step, so nobody has to leave the chat to hire, claim or pay. */}
      {a && <JobBar application={a} isCompany={isCompany} />}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50/60 px-3 py-4 sm:px-5">
        {a && (
          <Bubble mine={!isCompany} name={a.applicant.fullName} avatar={a.applicant.avatarUrl} time={a.createdAt} label="Application">
            {a.message}
          </Bubble>
        )}
        {messages.isLoading ? (
          <div className="flex justify-center py-6 text-brand-500">
            <Spinner />
          </div>
        ) : (
          list.map((m) => (
            <Bubble key={m.id} mine={m.sender.id === user?.id} name={m.sender.displayName} avatar={m.sender.avatarUrl} time={m.createdAt}>
              {m.content}
            </Bubble>
          ))
        )}
        {a && !messages.isLoading && list.length === 0 && (
          <p className="py-2 text-center text-xs text-slate-400">No replies yet. Say hello and agree on the details here.</p>
        )}
        <div ref={endRef} />
      </div>

      <Composer applicationId={applicationId} />
    </div>
  )
}

const hints: Record<ApplicationStage, { company: (a: Application) => string; individual: (a: Application) => string }> = {
  New: { company: () => 'New applicant. Hire or decline when ready.', individual: () => 'Waiting for the company to reply.' },
  Hired: {
    company: (a) =>
      !postTypeHasPayments(a.postType)
        ? 'Hired. Agree on the details here.'
        : a.claimDeclineReason
          ? 'You declined the last claim. Waiting for a new one.'
          : 'Working on the job. They claim payment when done.',
    individual: (a) =>
      !postTypeHasPayments(a.postType)
        ? 'You’re hired. Agree on the details here.'
        : a.claimDeclineReason
          ? `Claim declined: “${a.claimDeclineReason}”`
          : 'You’re hired. Claim payment when the work is done.',
  },
  Claimed: {
    company: (a) => `Claimed ${formatMoney(a.claimedAmount!)}. ${COMPANY_PAYS_CLAIMS ? 'Pay it or decline the claim.' : 'The admin will check it and pay.'}`,
    individual: (a) => `You claimed ${formatMoney(a.claimedAmount!)}. Waiting for payment.`,
  },
  Paid: { company: (a) => `Paid ${formatMoney(a.paidAmount)}. Job closed.`, individual: (a) => `${formatMoney(a.paidAmount)} is in your wallet.` },
  Declined: { company: () => 'You declined this application.', individual: () => 'Not selected this time.' },
}

function JobBar({ application: a, isCompany }: { application: Application; isCompany: boolean }) {
  const stage = stageOf(a)
  const meta = stageMeta[stage]
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-3 py-2.5 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Badge tone={meta.tone} className="shrink-0">
          {isCompany ? meta.company : meta.individual}
        </Badge>
        <p className="min-w-0 text-xs text-slate-600 sm:truncate">{hints[stage][isCompany ? 'company' : 'individual'](a)}</p>
      </div>
      <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:*:flex-1">
        <JobActions application={a} />
      </div>
    </div>
  )
}

function Composer({ applicationId }: { applicationId: string }) {
  const send = useSendMessage(applicationId)
  const [text, setText] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    send.mutate(content, {
      onSuccess: () => setText(''),
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t border-slate-100 bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
      <label htmlFor={`msg-${applicationId}`} className="sr-only">
        Message
      </label>
      <Textarea
        id={`msg-${applicationId}`}
        rows={1}
        maxLength={2000}
        enterKeyHint="send"
        placeholder="Write a message…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }
        }}
        className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl"
      />
      <Button type="submit" size="icon" className="size-11 rounded-full" aria-label="Send" loading={send.isPending} disabled={!text.trim()}>
        <Send className="size-4" />
      </Button>
    </form>
  )
}

function Bubble({
  mine,
  name,
  avatar,
  time,
  label,
  children,
}: {
  mine: boolean
  name: string
  avatar: string | null
  time: string
  /** Small tag above the text, e.g. "Application" for the message that started the chat. */
  label?: string
  children: string
}) {
  return (
    <div className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
      <Avatar name={name} src={avatar} size="xs" />
      <div className={cn('max-w-[80%]', mine && 'text-right')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-left text-sm break-words whitespace-pre-line',
            mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200/70',
          )}
        >
          {label && <span className={cn('mb-0.5 block text-[11px] font-semibold uppercase', mine ? 'text-brand-100' : 'text-accent-600')}>{label}</span>}
          {children}
        </div>
        <p className="mt-1 px-1 text-[11px] text-slate-400">{timeAgo(time)}</p>
      </div>
    </div>
  )
}

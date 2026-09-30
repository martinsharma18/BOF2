import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MessagesSquare, Send } from 'lucide-react'
import { Avatar, Button, Dialog, Spinner, Textarea, toast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import type { Application } from '@/lib/types'
import { useApplicationMessages, useSendMessage } from './api'

/** Chat between the company and the applicant about one application. */
export function ConversationDialog({ application, open, onClose }: { application: Application; open: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const messages = useApplicationMessages(application.id, open)
  const send = useSendMessage(application.id)
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const isCompany = user?.id === application.company.id
  const other = isCompany
    ? { name: application.applicant.fullName, avatar: application.applicant.avatarUrl }
    : { name: application.company.displayName, avatar: application.company.avatarUrl }

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.data?.length, open])

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
    <Dialog open={open} onClose={onClose} size="lg" title={`Chat with ${other.name}`} description={application.postTitle}>
      <div className="space-y-3">
        {/* The application itself opens the conversation. */}
        <Bubble mine={!isCompany} name={application.applicant.fullName} avatar={application.applicant.avatarUrl} time={application.createdAt}>
          {application.message}
        </Bubble>

        {messages.isLoading ? (
          <div className="flex justify-center py-6 text-brand-500">
            <Spinner />
          </div>
        ) : messages.data?.length ? (
          messages.data.map((m) => (
            <Bubble key={m.id} mine={m.sender.id === user?.id} name={m.sender.displayName} avatar={m.sender.avatarUrl} time={m.createdAt}>
              {m.content}
            </Bubble>
          ))
        ) : (
          <p className="flex items-center justify-center gap-2 py-4 text-sm text-slate-400">
            <MessagesSquare className="size-4" /> No replies yet. Say hello.
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="sticky bottom-0 mt-4 flex items-end gap-2 bg-white pt-2">
        <label htmlFor={`msg-${application.id}`} className="sr-only">
          Message
        </label>
        <Textarea
          id={`msg-${application.id}`}
          rows={2}
          maxLength={2000}
          placeholder="Write a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          className="flex-1"
        />
        <Button type="submit" size="icon" className="size-11" aria-label="Send" loading={send.isPending} disabled={!text.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </Dialog>
  )
}

function Bubble({
  mine,
  name,
  avatar,
  time,
  children,
}: {
  mine: boolean
  name: string
  avatar: string | null
  time: string
  children: string
}) {
  return (
    <div className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
      <Avatar name={name} src={avatar} size="xs" />
      <div className={cn('max-w-[80%]', mine && 'text-right')}>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-left text-sm break-words whitespace-pre-line',
            mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-slate-100 text-slate-800',
          )}
        >
          {children}
        </div>
        <p className="mt-1 px-1 text-[11px] text-slate-400">{timeAgo(time)}</p>
      </div>
    </div>
  )
}

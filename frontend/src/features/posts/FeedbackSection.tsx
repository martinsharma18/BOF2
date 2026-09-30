import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SendHorizontal, Trash2 } from 'lucide-react'
import { Avatar, Button, Skeleton, Textarea, toast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { getErrorMessage } from '@/lib/api'
import { timeAgo } from '@/lib/format'
import { useAddFeedback, useDeleteFeedback, useFeedback } from './api'

const MAX_LENGTH = 2000

export function FeedbackSection({ postId, autoFocus }: { postId: string; autoFocus?: boolean }) {
  const { user, isAdmin } = useAuth()
  const feedback = useFeedback(postId)
  const add = useAddFeedback(postId)
  const remove = useDeleteFeedback(postId)
  const [content, setContent] = useState('')

  const items = feedback.data?.pages.flatMap((p) => p.items) ?? []

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = content.trim()
    if (!text) return
    add.mutate(text, {
      onSuccess: () => setContent(''),
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <div className="space-y-4">
      {user && (
        <form onSubmit={submit} className="flex items-start gap-3">
          <Avatar name={user.companyName ?? user.fullName} src={user.avatarUrl} size="sm" />
          <div className="flex-1">
            <label htmlFor={`feedback-${postId}`} className="sr-only">
              Write feedback
            </label>
            <Textarea
              id={`feedback-${postId}`}
              rows={2}
              maxLength={MAX_LENGTH}
              autoFocus={autoFocus}
              placeholder="Share your feedback…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e)
              }}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {content.length > MAX_LENGTH - 200 && `${content.length}/${MAX_LENGTH}`}
              </span>
              <Button
                type="submit"
                size="sm"
                loading={add.isPending}
                disabled={!content.trim()}
                icon={<SendHorizontal className="size-3.5" />}
              >
                Send
              </Button>
            </div>
          </div>
        </form>
      )}

      {feedback.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-14 flex-1 rounded-xl" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-3 text-center text-sm text-slate-400">No feedback yet — be the first to share yours.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((f) => (
            <li key={f.id} className="group flex gap-3">
              <Link to={`/u/${f.author.id}`} className="shrink-0">
                <Avatar name={f.author.displayName} src={f.author.avatarUrl} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="rounded-2xl rounded-tl-sm bg-slate-100/80 px-3.5 py-2.5">
                  <Link to={`/u/${f.author.id}`} className="text-sm font-semibold text-slate-900 hover:underline">
                    {f.author.displayName}
                  </Link>
                  <p className="text-sm break-words whitespace-pre-line text-slate-700">{f.content}</p>
                </div>
                <div className="mt-1 flex items-center gap-3 px-1 text-xs text-slate-400">
                  <time dateTime={f.createdAt}>{timeAgo(f.createdAt)}</time>
                  {(f.author.id === user?.id || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => remove.mutate(f.id, { onSuccess: () => toast.success('Feedback deleted') })}
                      disabled={remove.isPending}
                      className="inline-flex items-center gap-1 font-medium hover:text-red-600"
                    >
                      <Trash2 className="size-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {feedback.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => feedback.fetchNextPage()} loading={feedback.isFetchingNextPage}>
            Show more feedback
          </Button>
        </div>
      )}
    </div>
  )
}

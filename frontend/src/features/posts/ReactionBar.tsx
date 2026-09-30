import { useEffect, useRef, useState } from 'react'
import { SmilePlus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatCompact } from '@/lib/format'
import type { Post, ReactionType } from '@/lib/types'
import { useReact } from './api'
import { reactionMeta, reactions } from './labels'

/** Summary of reactions: top emojis + total. */
export function ReactionSummary({ post }: { post: Post }) {
  const entries = (Object.entries(post.reactionCounts) as [ReactionType, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, n]) => sum + n, 0)
  if (total === 0) return null

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500" title={entries.map(([t, n]) => `${t} ${n}`).join(' · ')}>
      <span className="flex -space-x-1" aria-hidden>
        {entries.slice(0, 3).map(([type]) => (
          <span key={type} className="flex size-5 items-center justify-center rounded-full bg-white text-xs ring-2 ring-white">
            {reactionMeta(type).emoji}
          </span>
        ))}
      </span>
      {formatCompact(total)}
    </span>
  )
}

/** "React" button that opens an emoji picker; clicking your current reaction removes it. */
export function ReactionButton({ post }: { post: Post }) {
  const react = useReact(post.id)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const mine = post.myReaction ? reactionMeta(post.myReaction) : null

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (type: ReactionType) => {
    setOpen(false)
    react.mutate(post.myReaction === type ? null : type)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors',
          mine ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' : 'text-slate-600 hover:bg-slate-100',
        )}
      >
        {mine ? <span aria-hidden>{mine.emoji}</span> : <SmilePlus className="size-4" aria-hidden />}
        {mine ? mine.label : 'React'}
      </button>
      {open && (
        <div
          role="group"
          aria-label="Choose a reaction"
          className="absolute bottom-full left-0 z-30 mb-2 flex animate-pop-in gap-1 rounded-full bg-white p-1.5 shadow-pop ring-1 ring-slate-200"
        >
          {reactions.map((r) => (
            <button
              key={r.type}
              type="button"
              title={r.label}
              aria-label={r.label}
              aria-pressed={post.myReaction === r.type}
              onClick={() => choose(r.type)}
              className={cn(
                'flex size-10 items-center justify-center rounded-full text-xl transition-transform hover:scale-125',
                post.myReaction === r.type && 'bg-brand-50',
              )}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PenSquare, Sparkles } from 'lucide-react'
import { ButtonLink, EmptyState } from '@/components/ui'
import { WithRail } from '@/components/layout/AppShell'
import { useAuth } from '@/features/auth/AuthContext'
import { FeedFilters } from '@/features/posts/FeedFilters'
import { PostList } from '@/features/posts/PostList'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { PostFilters, PostType } from '@/lib/types'
import { FeedRail } from './FeedRail'

const FILTER_KEYS = ['search', 'type', 'province', 'district'] as const

export function FeedPage() {
  useDocumentTitle('Feed')
  const { canPost } = useAuth()
  const [params, setParams] = useSearchParams()

  // Filters live in the URL so they survive refresh and can be shared.
  const filters = useMemo<PostFilters>(
    () => ({
      search: params.get('search') ?? undefined,
      type: (params.get('type') as PostType | null) ?? undefined,
      province: params.get('province') ?? undefined,
      district: params.get('district') ?? undefined,
    }),
    [params],
  )

  const setFilters = (next: PostFilters) => {
    const updated = new URLSearchParams()
    for (const key of FILTER_KEYS) if (next[key]) updated.set(key, next[key]!)
    setParams(updated, { replace: true })
  }

  const isFiltered = FILTER_KEYS.some((k) => filters[k])

  return (
    <WithRail rail={<FeedRail />}>
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Feed</h1>
        <p className="mt-1 text-sm text-slate-500">Latest posts from companies and people across Nepal.</p>
      </div>
      <div className="mb-5">
        <FeedFilters value={filters} onChange={setFilters} />
      </div>
      <PostList
        filters={filters}
        empty={
          isFiltered ? undefined : (
            <EmptyState
              icon={<Sparkles className="size-6" />}
              title="No posts yet"
              description="Be the first to share a requirement with the community."
              action={
                canPost && (
                  <ButtonLink to="/posts/new" icon={<PenSquare className="size-4" />}>
                    Create the first post
                  </ButtonLink>
                )
              }
            />
          )
        }
      />
    </WithRail>
  )
}

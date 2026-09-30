import { Fragment, useEffect, type ReactNode } from 'react'
import { FileText } from 'lucide-react'
import { Alert, Card, EmptyState, Spinner } from '@/components/ui'
import { AdSlot } from '@/features/ads/AdSlot'
import { useInView } from '@/hooks/useInView'
import { getErrorMessage } from '@/lib/api'
import type { PostFilters } from '@/lib/types'
import { usePosts } from './api'
import { PostCard, PostCardSkeleton } from './PostCard'

/** Infinite-scrolling list of posts, with a banner ad after every few posts. */
export function PostList({
  filters,
  empty,
  showAds = true,
}: {
  filters: PostFilters
  empty?: ReactNode
  showAds?: boolean
}) {
  const posts = usePosts(filters)
  const [sentinel, inView] = useInView<HTMLDivElement>()
  const items = posts.data?.pages.flatMap((p) => p.items) ?? []

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = posts
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (posts.isLoading)
    return (
      <div className="space-y-4">
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    )

  if (posts.isError) return <Alert>{getErrorMessage(posts.error)}</Alert>

  if (items.length === 0)
    return (
      <Card>
        {empty ?? (
          <EmptyState icon={<FileText className="size-6" />} title="No posts found" description="Try a different search or clear the filters." />
        )}
      </Card>
    )

  return (
    <div className="space-y-4">
      {items.map((post, i) => (
        <Fragment key={post.id}>
          <PostCard post={post} />
          {showAds && (i + 1) % 4 === 0 && <AdSlot placement="Banner" index={Math.floor(i / 4)} />}
        </Fragment>
      ))}
      <div ref={sentinel} className="flex justify-center py-4 text-brand-500">
        {isFetchingNextPage && <Spinner />}
        {!hasNextPage && items.length > 3 && <p className="text-sm text-slate-400">You're all caught up ✨</p>}
      </div>
    </div>
  )
}

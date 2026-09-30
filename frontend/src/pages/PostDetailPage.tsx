import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileQuestion } from 'lucide-react'
import { Button, ButtonLink, Card, EmptyState } from '@/components/ui'
import { WithRail } from '@/components/layout/AppShell'
import { usePost } from '@/features/posts/api'
import { PostCard, PostCardSkeleton } from '@/features/posts/PostCard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { FeedRail } from './FeedRail'

export function PostDetailPage() {
  const { id = '' } = useParams()
  const post = usePost(id)
  const navigate = useNavigate()
  useDocumentTitle(post.data?.title)

  return (
    <WithRail rail={<FeedRail />}>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} onClick={() => navigate(-1)} className="mb-4 -ml-2">
        Back
      </Button>
      {post.isLoading ? (
        <PostCardSkeleton />
      ) : post.isError || !post.data ? (
        <Card>
          <EmptyState
            icon={<FileQuestion className="size-6" />}
            title="Post not found"
            description="It may have been deleted by its author."
            action={<ButtonLink to="/feed">Back to feed</ButtonLink>}
          />
        </Card>
      ) : (
        <PostCard post={post.data} expanded onDeleted={() => navigate('/feed', { replace: true })} />
      )}
    </WithRail>
  )
}

import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PageHeader, PageSpinner, toast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { usePost } from '@/features/posts/api'
import { PostForm } from '@/features/posts/PostForm'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function NewPostPage() {
  useDocumentTitle('New post')
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Create a post" description="Tell people what you need. Clear posts get more reactions and feedback." />
      <PostForm
        onSaved={(post) => {
          toast.success('Your post is live')
          navigate(`/posts/${post.id}`, { replace: true })
        }}
      />
    </div>
  )
}

export function EditPostPage() {
  useDocumentTitle('Edit post')
  const { id = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const post = usePost(id)

  if (post.isLoading) return <PageSpinner />
  if (!post.data) return <Navigate to="/feed" replace />
  if (post.data.author.id !== user?.id) return <Navigate to={`/posts/${id}`} replace />

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit post" />
      <PostForm
        post={post.data}
        onSaved={() => {
          toast.success('Changes saved')
          navigate(`/posts/${id}`, { replace: true })
        }}
      />
    </div>
  )
}

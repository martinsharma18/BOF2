import { Link } from 'react-router-dom'
import { PenSquare } from 'lucide-react'
import { Avatar, ButtonLink, Card } from '@/components/ui'
import { AdSlot } from '@/features/ads/AdSlot'
import { useAuth } from '@/features/auth/AuthContext'
import { currentYear } from '@/lib/format'
import { APP_NAME } from '@/lib/brand'

/** Right rail shown next to the feed and post pages on wide screens. */
export function FeedRail() {
  const { user, canPost } = useAuth()
  if (!user) return null
  const name = user.companyName ?? user.fullName

  return (
    <>
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Avatar name={name} src={user.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">{user.accountType} account</p>
          </div>
        </div>
        {canPost && (
          <>
            <p className="mt-4 text-sm text-slate-600">Post an opportunity and review applications from people across Nepal.</p>
            <ButtonLink to="/posts/new" className="mt-4 w-full" icon={<PenSquare className="size-4" />}>
              Create a post
            </ButtonLink>
          </>
        )}
      </Card>
      <AdSlot placement="Sidebar" />
      <p className="px-2 text-xs text-slate-400">© {currentYear} {APP_NAME} · Made in Nepal · <Link to="/terms" className="hover:underline">Terms</Link> · <Link to="/privacy" className="hover:underline">Privacy</Link></p>
    </>
  )
}

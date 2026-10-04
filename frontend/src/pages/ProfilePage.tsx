import { useParams } from 'react-router-dom'
import { CalendarDays, ExternalLink, FileText, MapPin, PenSquare, Settings, UserX } from 'lucide-react'
import { Avatar, Badge, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui'
import { WithRail } from '@/components/layout/AppShell'
import { AdSlot, PhoneSquareAd } from '@/features/ads/AdSlot'
import { useAuth } from '@/features/auth/AuthContext'
import { PostList } from '@/features/posts/PostList'
import { useProfile } from '@/features/users/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate, pluralize } from '@/lib/format'

export function ProfilePage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const profile = useProfile(id)
  const isMe = user?.id === id
  const p = profile.data
  const name = p ? (p.companyName ?? p.fullName) : ''
  useDocumentTitle(name || 'Profile')

  if (profile.isError)
    return (
      <Card>
        <EmptyState icon={<UserX className="size-6" />} title="User not found" action={<ButtonLink to="/feed">Back to feed</ButtonLink>} />
      </Card>
    )

  return (
    <WithRail rail={<AdSlot placement="Sidebar" />}>
      <Card className="overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 sm:h-36" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            {p ? (
              <Avatar name={name} src={p.avatarUrl} size="xl" className="ring-4 ring-white" />
            ) : (
              <Skeleton className="size-24 rounded-full ring-4 ring-white" />
            )}
            {isMe && (
              <div className="flex gap-2">
                <ButtonLink to="/settings" variant="secondary" size="sm" icon={<Settings className="size-4" />}>
                  Edit profile
                </ButtonLink>
              </div>
            )}
          </div>

          {p ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{name}</h1>
                <Badge tone={p.accountType === 'Company' ? 'brand' : p.accountType === 'Admin' ? 'amber' : 'green'}>{p.accountType}</Badge>
              </div>
              {p.companyName && <p className="text-sm text-slate-500">{p.fullName}</p>}
              {p.bio && <p className="mt-3 max-w-2xl text-slate-700">{p.bio}</p>}
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                {p.district && (
                  <li className="flex items-center gap-1.5">
                    <MapPin className="size-4" /> {[p.localLevel, p.district, p.province].filter(Boolean).join(', ')}
                  </li>
                )}
                {p.age != null && <li>{p.age} years old</li>}
                <li className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" /> Joined {formatDate(p.joinedAt)}
                </li>
                <li className="flex items-center gap-1.5">
                  <FileText className="size-4" /> {pluralize(p.postCount, 'post')}
                </li>
                {p.socialMediaLink && (
                  <li>
                    <a href={p.socialMediaLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-medium text-brand-600 hover:underline">
                      <ExternalLink className="size-4" /> Social profile
                    </a>
                  </li>
                )}
              </ul>
            </>
          ) : (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
          )}
        </div>
      </Card>

      {/* The right-column ad, for screens that don't show that column. */}
      <PhoneSquareAd className="mt-6" />

      <h2 className="mt-8 mb-4 text-lg font-bold">{isMe ? 'My posts' : 'Posts'}</h2>
      <PostList
        filters={{ authorId: id }}
        showAds={false}
        empty={
          <EmptyState
            icon={<FileText className="size-6" />}
            title={isMe ? "You haven't posted yet" : 'No posts yet'}
            action={
              isMe &&
              p?.accountType === 'Company' && (
                <ButtonLink to="/posts/new" icon={<PenSquare className="size-4" />}>
                  Create your first post
                </ButtonLink>
              )
            }
          />
        }
      />
    </WithRail>
  )
}

import { Link } from 'react-router-dom'
import { AdSlot } from '@/features/ads/AdSlot'
import { useAuth } from '@/features/auth/AuthContext'
import { VacancyList } from '@/features/vacancies/VacancyList'
import { currentYear } from '@/lib/format'
import { APP_NAME } from '@/lib/brand'

/** Right rail shown next to the feed and post pages on wide screens. */
export function FeedRail() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <>
      <VacancyList />
      <AdSlot placement="Sidebar" />
      <p className="px-2 text-xs text-slate-400">© {currentYear} {APP_NAME} · Made in Nepal · <Link to="/terms" className="hover:underline">Terms</Link> · <Link to="/privacy" className="hover:underline">Privacy</Link></p>
    </>
  )
}

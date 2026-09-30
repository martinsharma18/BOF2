import type { ReactNode } from 'react'
import { Banknote, Building2, ClipboardList, FileText, Megaphone, MessageCircle, UserRound, Users } from 'lucide-react'
import { Alert, Card, Skeleton } from '@/components/ui'
import { useAdminStats } from '@/features/admin/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { formatCompact, formatMoney } from '@/lib/format'

export function AdminOverviewPage() {
  useDocumentTitle('Admin')
  const stats = useAdminStats()

  if (stats.isError) return <Alert>{getErrorMessage(stats.error)}</Alert>
  const s = stats.data

  const cards: { label: string; value?: number; icon: ReactNode; hint?: string }[] = [
    { label: 'Total users', value: s?.totalUsers, icon: <Users className="size-5" />, hint: s && `+${s.newUsersLast7Days} this week` },
    { label: 'Companies', value: s?.companies, icon: <Building2 className="size-5" /> },
    { label: 'Individuals', value: s?.individuals, icon: <UserRound className="size-5" /> },
    { label: 'Applications', value: s?.totalApplications, icon: <ClipboardList className="size-5" /> },
    { label: 'Total posts', value: s?.totalPosts, icon: <FileText className="size-5" />, hint: s && `+${s.postsLast7Days} this week` },
    {
      label: 'Pending withdrawals',
      value: s?.pendingWithdrawals,
      icon: <Banknote className="size-5" />,
      hint: s && `${formatMoney(s.pendingWithdrawalAmount)} to pay · ${formatMoney(s.totalPaidOut)} paid out`,
    },
    { label: 'Feedback', value: s?.totalFeedback, icon: <MessageCircle className="size-5" /> },
    { label: 'Running ads', value: s?.activeAds, icon: <Megaphone className="size-5" /> },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">{c.label}</p>
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{c.icon}</span>
          </div>
          {c.value === undefined ? (
            <Skeleton className="mt-3 h-8 w-16" />
          ) : (
            <p className="mt-3 font-display text-3xl font-bold text-slate-900 tabular-nums">{formatCompact(c.value)}</p>
          )}
          {c.hint && <p className="mt-1 text-xs font-medium text-emerald-600">{c.hint}</p>}
        </Card>
      ))}
    </div>
  )
}

import { NavLink, Outlet } from 'react-router-dom'
import { Banknote, BarChart3, Briefcase, Megaphone, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui'
import { cn } from '@/lib/cn'

const tabs = [
  { to: '/admin', label: 'Overview', icon: <BarChart3 className="size-4" />, end: true },
  { to: '/admin/users', label: 'Users', icon: <Users className="size-4" /> },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: <Banknote className="size-4" /> },
  { to: '/admin/vacancies', label: 'Vacancies', icon: <Briefcase className="size-4" /> },
  { to: '/admin/ads', label: 'Ads', icon: <Megaphone className="size-4" /> },
]

export function AdminLayout() {
  return (
    <div>
      <PageHeader title="Super Admin" description="Verify cash withdrawals, post vacancies, monitor activity, manage users and run the advertising spaces." />
      <nav aria-label="Admin sections" className="scrollbar-none mb-6 flex gap-1 overflow-x-auto rounded-xl bg-slate-200/60 p-1">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition',
                isActive ? 'bg-white text-slate-900 shadow-card' : 'text-slate-600 hover:text-slate-900',
              )
            }
          >
            {t.icon}
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}

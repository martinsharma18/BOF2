import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, ClipboardList, Home, LayoutDashboard, LogOut, PenSquare, Search, Settings, UserRound, Wallet } from 'lucide-react'
import { Avatar, ButtonLink, Input, Menu, MenuItem, MenuSeparator } from '@/components/ui'
import { useApplications } from '@/features/applications/api'
import { useAuth } from '@/features/auth/AuthContext'
import { NotificationBell, UnreadBadge } from '@/features/notifications/NotificationBell'
import { useUnreadCount } from '@/features/notifications/api'
import { WalletCard } from '@/features/wallet/WalletCard'
import { cn } from '@/lib/cn'
import { Logo } from './Logo'
import { APP_NAME } from '@/lib/brand'

interface NavItem {
  to: string
  label: string
  /** Shorter label for the mobile bottom bar. */
  short?: string
  icon: ReactNode
  end?: boolean
  /** Shown in the mobile bottom bar (keep it to 4). */
  mobile?: boolean
  badge?: number
}

function useNavItems(): NavItem[] {
  const { user, isAdmin, canPost } = useAuth()
  const isIndividual = user?.accountType === 'Individual'
  const unread = useUnreadCount().data ?? 0

  const items: NavItem[] = [{ to: '/feed', label: 'Feed', icon: <Home className="size-5" />, mobile: true }]
  if (canPost || isIndividual)
    items.push({
      to: '/applications',
      label: canPost ? 'Applicants' : 'My applications',
      short: canPost ? 'Applicants' : 'Applied',
      icon: <ClipboardList className="size-5" />,
      mobile: true,
    })
  if (isIndividual) items.push({ to: '/wallet', label: 'Wallet', icon: <Wallet className="size-5" />, mobile: true })
  items.push({ to: '/notifications', label: 'Notifications', icon: <Bell className="size-5" />, badge: unread })
  items.push({ to: `/u/${user?.id}`, label: 'My profile', short: 'Profile', icon: <UserRound className="size-5" />, mobile: true })
  items.push({ to: '/settings', label: 'Settings', icon: <Settings className="size-5" /> })
  if (isAdmin) items.push({ to: '/admin', label: 'Admin', icon: <LayoutDashboard className="size-5" />, mobile: true })
  return items
}

function HeaderSearch() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [value, setValue] = useState(params.get('search') ?? '')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = value.trim()
    navigate(q ? `/feed?search=${encodeURIComponent(q)}` : '/feed')
  }

  return (
    <form onSubmit={submit} role="search" className="hidden w-full max-w-md md:block">
      <label htmlFor="global-search" className="sr-only">
        Search {APP_NAME}
      </label>
      <Input
        id="global-search"
        type="search"
        placeholder="Search posts, companies, people…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        leading={<Search className="size-4" />}
        className="bg-slate-100 ring-transparent focus:bg-white"
      />
    </form>
  )
}

function UserMenu() {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const name = user.companyName ?? user.fullName

  return (
    <Menu
      label="Account menu"
      trigger={<Avatar name={name} src={user.avatarUrl} size="sm" className="ring-2 ring-white hover:ring-brand-200" />}
    >
      <div className="px-3 py-2">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
      <MenuSeparator />
      <MenuItem to={`/u/${user.id}`} icon={<UserRound className="size-4" />}>
        My profile
      </MenuItem>
      {user.accountType === 'Individual' && (
        <MenuItem to="/wallet" icon={<Wallet className="size-4" />}>
          Wallet
        </MenuItem>
      )}
      <MenuItem to="/settings" icon={<Settings className="size-4" />}>
        Settings
      </MenuItem>
      {isAdmin && (
        <MenuItem to="/admin" icon={<LayoutDashboard className="size-4" />}>
          Admin dashboard
        </MenuItem>
      )}
      <MenuSeparator />
      <MenuItem
        icon={<LogOut className="size-4" />}
        onClick={async () => {
          await signOut()
          navigate('/', { replace: true })
        }}
      >
        Log out
      </MenuItem>
    </Menu>
  )
}

export function AppShell() {
  const { user, canPost } = useAuth()
  const navItems = useNavItems()
  const mobileItems = navItems.filter((item) => item.mobile)

  return (
    <div className="min-h-dvh pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo to="/feed" />
          <div className="flex flex-1 justify-center">
            <HeaderSearch />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {canPost && (
              <ButtonLink to="/posts/new" size="md" icon={<PenSquare className="size-4" />} className="hidden sm:inline-flex">
                New post
              </ButtonLink>
            )}
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6">
        <nav aria-label="Main" className="sticky top-22 hidden h-fit w-56 shrink-0 space-y-1 lg:block">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive ? 'bg-white text-brand-700 shadow-card ring-1 ring-slate-200/70' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                )
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {!!item.badge && <UnreadBadge count={item.badge} className="ring-0" />}
            </NavLink>
          ))}
          {canPost && (
            <ButtonLink to="/posts/new" className="mt-4 w-full" icon={<PenSquare className="size-4" />}>
              New post
            </ButtonLink>
          )}
          {/* The free space under the menu: wallet for individuals, pending applicants for companies. */}
          <div className="pt-5">
            {user?.accountType === 'Individual' && <WalletCard />}
            {canPost && <PendingApplicantsCard />}
          </div>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-2">
          {mobileItems.slice(0, 1).map((item) => (
            <MobileNavLink key={item.to} item={item} />
          ))}
          {canPost && (
            <NavLink
              to="/posts/new"
              aria-label="New post"
              className="-mt-6 flex size-14 items-center justify-center rounded-2xl bg-accent-500 text-white shadow-pop"
            >
              <PenSquare className="size-6" />
            </NavLink>
          )}
          {mobileItems.slice(1).map((item) => (
            <MobileNavLink key={item.to} item={item} />
          ))}
        </div>
      </nav>
    </div>
  )
}

function MobileNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-semibold',
          isActive ? 'text-brand-600' : 'text-slate-500',
        )
      }
    >
      {item.icon}
      {item.short ?? item.label}
    </NavLink>
  )
}

function PendingApplicantsCard() {
  const pending = useApplications({ status: 'Pending', page: 1 }).data?.totalCount
  if (pending === undefined) return null
  return (
    <Link
      to="/applications"
      className="block rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-card transition hover:from-brand-700"
    >
      <p className="text-xs font-medium text-brand-100">Waiting for your reply</p>
      <p className="mt-0.5 font-display text-2xl font-extrabold tabular-nums">{pending}</p>
      <p className="mt-1 text-xs text-brand-100">{pending === 1 ? 'application' : 'applications'} · review now →</p>
    </Link>
  )
}

/** Two-column page body with a right rail (ads, tips) on large screens. */
export function WithRail({ children, rail }: { children: ReactNode; rail: ReactNode }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">{children}</div>
      <aside className="hidden xl:block">
        <div className="sticky top-22 space-y-4">{rail}</div>
      </aside>
    </div>
  )
}

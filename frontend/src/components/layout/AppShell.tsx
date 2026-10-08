import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, ClipboardList, Home, Inbox, LayoutDashboard, LogOut, Mail, Menu as MenuIcon, MessageCircle, PenSquare, Search, Settings, UserRound, Wallet } from 'lucide-react'
import { Avatar, ButtonLink, ConfirmDialog, Dialog, Input, Menu, MenuItem, MenuSeparator } from '@/components/ui'
import { useApplications } from '@/features/applications/api'
import { useAuth } from '@/features/auth/AuthContext'
import { useChatUnreadCount } from '@/features/chat/api'
import { NotificationBell, UnreadBadge } from '@/features/notifications/NotificationBell'
import { useInboxUnreadCount } from '@/features/inbox/api'
import { useUnreadCount } from '@/features/notifications/api'
import { postTypes } from '@/features/posts/labels'
import { InstallBanner, InstallMenuItem, OfflineBanner } from '@/features/pwa/PwaUi'
import { WalletCard } from '@/features/wallet/WalletCard'
import { cn } from '@/lib/cn'
import { Logo } from './Logo'
import { APP_NAME } from '@/lib/brand'

interface NavItem {
  to: string
  label: string
  short?: string
  icon: ReactNode
  end?: boolean
  /** Shown in the phone bottom bar (keep it to 4 per role); the rest go under "More". */
  mobile?: boolean
  badge?: number
}

function useNavItems(): NavItem[] {
  const { user, isAdmin, canPost } = useAuth()
  const isIndividual = user?.accountType === 'Individual'
  const unread = useUnreadCount().data ?? 0
  const inboxUnread = useInboxUnreadCount(isIndividual).data ?? 0
  const chatUnread = useChatUnreadCount(canPost || isIndividual).data ?? 0

  // `mobile` items go in the phone bottom bar (max 4); the rest live under "More".
  const items: NavItem[] = [{ to: '/feed', label: 'Feed', icon: <Home className="size-5" />, mobile: true }]
  if (canPost || isIndividual)
    items.push({
      to: '/applications',
      label: canPost ? 'Applicants' : 'My applications',
      short: canPost ? 'Applicants' : 'Applied',
      icon: <ClipboardList className="size-5" />,
      mobile: true,
    })
  // Chat with companies / applicants. Notifications stay in the bell; conversations live here.
  if (canPost || isIndividual)
    items.push({ to: '/messages', label: 'Messages', short: 'Chats', icon: <MessageCircle className="size-5" />, badge: chatUnread, mobile: true })
  if (isIndividual) items.push({ to: '/wallet', label: 'Wallet', icon: <Wallet className="size-5" />, mobile: true })
  if (isIndividual) items.push({ to: '/inbox', label: 'Inbox', icon: <Inbox className="size-5" />, badge: inboxUnread })
  if (canPost) items.push({ to: '/invitations', label: 'Invitations', short: 'Invite', icon: <Mail className="size-5" /> })
  items.push({ to: '/notifications', label: 'Notifications', icon: <Bell className="size-5" />, badge: unread })
  items.push({ to: `/u/${user?.id}`, label: 'My profile', short: 'Profile', icon: <UserRound className="size-5" /> })
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
  const { user, isAdmin } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  if (!user) return null
  const name = user.companyName ?? user.fullName

  return (
    <>
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
          onClick={() => setLoggingOut(true)}
        >
          Log out
        </MenuItem>
      </Menu>
      <LogoutConfirm open={loggingOut} onClose={() => setLoggingOut(false)} />
    </>
  )
}

/** "Log out?" Signing out also stops phone notifications on this device, so it's worth one extra tap. */
function LogoutConfirm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={async () => {
        setBusy(true)
        await signOut()
        navigate('/login', { replace: true })
      }}
      title="Log out?"
      description="You will stop getting notifications on this device until you log in again."
      confirmLabel="Log out"
      danger
      loading={busy}
    />
  )
}

export function AppShell() {
  const { user, canPost } = useAuth()
  const navItems = useNavItems()
  const mobileItems = navItems.filter((item) => item.mobile)
  const moreItems = navItems.filter((item) => !item.mobile)
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  // Close the "More" sheet once the user picks a page.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMoreOpen(false)
  }
  const moreActive = moreItems.some((item) => pathname.startsWith(item.to))
  const moreBadge = moreItems.reduce((sum, item) => sum + (item.badge ?? 0), 0)

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <OfflineBanner />
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo to="/feed" />
          <div className="flex flex-1 justify-center">
            <HeaderSearch />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {canPost && (
              <ButtonLink to="/posts/new" size="md" icon={<PenSquare className="size-4" />} className="max-sm:hidden">
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
          <InstallBanner />
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch px-1">
          {mobileItems.slice(0, 2).map((item) => (
            <MobileNavLink key={item.to} item={item} />
          ))}
          {canPost && (
            <div className="flex flex-1 justify-center">
              <NavLink
                to="/posts/new"
                aria-label="New post"
                className="-mt-5 flex size-14 items-center justify-center rounded-2xl bg-accent-500 text-white shadow-pop active:bg-accent-600"
              >
                <PenSquare className="size-6" />
              </NavLink>
            </div>
          )}
          {mobileItems.slice(2).map((item) => (
            <MobileNavLink key={item.to} item={item} />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            className={cn(tabClass, moreOpen || moreActive ? 'text-brand-600' : 'text-slate-500')}
          >
            <span className="relative">
              <MenuIcon className="size-5" />
              {moreBadge > 0 && <span className="absolute -top-0.5 -right-1 size-2.5 rounded-full bg-accent-500 ring-2 ring-white" aria-label="New" />}
            </span>
            More
          </button>
        </div>
      </nav>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} items={moreItems} />
    </div>
  )
}

const tabClass = 'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold'

function MobileNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => cn(tabClass, isActive ? 'text-brand-600' : 'text-slate-500')}>
      <span className="relative">
        {item.icon}
        {!!item.badge && <UnreadBadge count={item.badge} className="absolute -top-1.5 left-3" />}
      </span>
      {item.short ?? item.label}
    </NavLink>
  )
}

/** Phone "More" menu: everything that isn't in the bottom bar, plus log out. */
function MoreSheet({ open, onClose, items }: { open: boolean; onClose: () => void; items: NavItem[] }) {
  const { user } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  if (!user) return null
  const name = user.companyName ?? user.fullName

  return (
    <>
      <Dialog open={open} onClose={onClose} title="Menu">
        <Link to={`/u/${user.id}`} className="-mx-1 mb-3 flex items-center gap-3 rounded-xl p-2 active:bg-slate-100">
          <Avatar name={name} src={user.avatarUrl} size="md" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-900">{name}</span>
            <span className="block truncate text-sm text-slate-500">{user.email}</span>
          </span>
        </Link>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 active:bg-slate-100',
                  )
                }
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {!!item.badge && <UnreadBadge count={item.badge} className="ring-0" />}
              </NavLink>
            </li>
          ))}
          <InstallMenuItem />
          <li>
            <button
              type="button"
              onClick={() => setLoggingOut(true)}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-red-600 active:bg-red-50"
            >
              <LogOut className="size-5" />
              Log out
            </button>
          </li>
        </ul>
      </Dialog>
      <LogoutConfirm open={loggingOut} onClose={() => setLoggingOut(false)} />
    </>
  )
}

/**
 * Company to-do: new applications to answer, people hired on paid post types still to pay,
 * and how many applied to posts without in-app payment (Type 2).
 */
function PendingApplicantsCard() {
  const paidType = postTypes.find((t) => t.payments)
  const unpaidType = postTypes.find((t) => !t.payments)
  const pending = useApplications({ status: 'Pending', page: 1 }).data?.totalCount
  const hired = useApplications({ status: 'Accepted', postType: paidType?.value, page: 1 }).data?.totalCount
  const unpaidApplied = useApplications({ postType: unpaidType?.value, page: 1 }).data?.totalCount
  if (pending === undefined || hired === undefined || unpaidApplied === undefined) return null

  const tiles = [
    { count: pending, label: 'to review' },
    { count: hired, label: `${paidType?.label ?? ''} hired, to pay` },
    { count: unpaidApplied, label: `${unpaidType?.label ?? ''} applied` },
  ]
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-card">
      <p className="px-4 pt-4 text-xs font-medium text-brand-100">Your to-do</p>
      <div className="grid grid-cols-3 divide-x divide-white/15 px-1 py-2">
        {tiles.map((t) => (
          <Link key={t.label} to="/applications" className="min-w-0 rounded-lg px-2.5 py-1 hover:bg-white/10">
            <p className="font-display text-2xl font-extrabold tabular-nums">{t.count}</p>
            <p className="text-[11px] leading-tight text-brand-100">{t.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

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

import type { ReactNode } from 'react'
import { Banknote, BanknoteX, CircleCheckBig, CircleX, Hand, HandCoins, Mail, MessageCircleMore, UserPlus, Wallet } from 'lucide-react'
import type { NotificationType } from '@/lib/types'

/**
 * How each kind of notification looks: a short category name, an icon, a colour, and the button text
 * for what tapping it does. One place, so the bell preview and the Notifications page always match.
 */
export const notificationMeta: Record<NotificationType, { category: string; icon: ReactNode; className: string; action: string }> = {
  ApplicationReceived: { category: 'New applicant', icon: <UserPlus />, className: 'bg-brand-100 text-brand-700', action: 'Review' },
  ApplicationAccepted: { category: 'Hired', icon: <CircleCheckBig />, className: 'bg-emerald-100 text-emerald-700', action: 'Open job' },
  ApplicationRejected: { category: 'Not selected', icon: <CircleX />, className: 'bg-slate-200 text-slate-600', action: 'View' },
  PaymentClaimed: { category: 'Payment claim', icon: <Hand />, className: 'bg-amber-100 text-amber-700', action: 'Pay or decline' },
  ClaimDeclined: { category: 'Claim declined', icon: <CircleX />, className: 'bg-red-100 text-red-700', action: 'Fix and claim again' },
  PaymentReceived: { category: 'Payment received', icon: <HandCoins />, className: 'bg-emerald-100 text-emerald-700', action: 'Open wallet' },
  NewMessage: { category: 'Message', icon: <MessageCircleMore />, className: 'bg-sky-100 text-sky-700', action: 'Reply' },
  WithdrawalRequested: { category: 'Withdrawal request', icon: <Wallet />, className: 'bg-accent-100 text-accent-700', action: 'Verify' },
  WithdrawalPaid: { category: 'Withdrawal done', icon: <Banknote />, className: 'bg-emerald-100 text-emerald-700', action: 'Open wallet' },
  WithdrawalRejected: { category: 'Withdrawal rejected', icon: <BanknoteX />, className: 'bg-red-100 text-red-700', action: 'Open wallet' },
  Invitation: { category: 'Invitation', icon: <Mail />, className: 'bg-brand-100 text-brand-700', action: 'Open' },
  VacancyApplicationAccepted: { category: 'Vacancy accepted', icon: <CircleCheckBig />, className: 'bg-emerald-100 text-emerald-700', action: 'Open' },
  VacancyApplicationRejected: { category: 'Vacancy not selected', icon: <CircleX />, className: 'bg-slate-200 text-slate-600', action: 'Open' },
}

/** Today / Yesterday / Earlier, for grouping the list. */
export function dayGroup(iso: string): 'Today' | 'Yesterday' | 'Earlier' {
  const date = new Date(iso)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  if (date.getTime() >= startOfToday) return 'Today'
  if (date.getTime() >= startOfToday - 86_400_000) return 'Yesterday'
  return 'Earlier'
}

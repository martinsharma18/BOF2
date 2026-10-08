import type { AccountType } from '@/lib/types'
import { Badge } from './Display'

const meta: Record<AccountType, { label: string; tone: 'brand' | 'green' | 'amber' }> = {
  Company: { label: 'Company', tone: 'brand' },
  Individual: { label: 'Individual', tone: 'green' },
  Admin: { label: 'Super Admin', tone: 'amber' },
}

export function AccountTypeBadge({ type, className }: { type: AccountType; className?: string }) {
  return (
    <Badge tone={meta[type].tone} className={className}>
      {meta[type].label}
    </Badge>
  )
}

import type { ApplicationStatus, WithdrawalStatus } from '@/lib/types'

type Tone = 'brand' | 'slate' | 'green' | 'amber' | 'red'

export const applicationStatusMeta: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  Pending: { label: 'Waiting for reply', tone: 'amber' },
  Accepted: { label: 'Accepted', tone: 'green' },
  Rejected: { label: 'Declined', tone: 'red' },
}

export const withdrawalStatusMeta: Record<WithdrawalStatus, { label: string; tone: Tone }> = {
  Pending: { label: 'Waiting for admin', tone: 'amber' },
  Paid: { label: 'Paid', tone: 'green' },
  Rejected: { label: 'Rejected', tone: 'red' },
}

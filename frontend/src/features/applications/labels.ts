import type { Application, ApplicationStatus, WithdrawalStatus } from '@/lib/types'

export type Tone = 'brand' | 'slate' | 'green' | 'amber' | 'red'

/** Where a job really is. "Hired" splits into Hired (working) and Claimed (waiting to be paid). */
export type ApplicationStage = 'New' | 'Hired' | 'Claimed' | 'Paid' | 'Declined'

export function stageOf(a: Pick<Application, 'status' | 'claimedAmount'>): ApplicationStage {
  switch (a.status) {
    case 'Pending':
      return 'New'
    case 'Accepted':
      return a.claimedAmount !== null ? 'Claimed' : 'Hired'
    case 'Completed':
      return 'Paid'
    case 'Rejected':
      return 'Declined'
  }
}

/** Badge text per stage, worded for whoever is looking. */
export const stageMeta: Record<ApplicationStage, { company: string; individual: string; tone: Tone }> = {
  New: { company: 'New applicant', individual: 'Applied', tone: 'brand' },
  Hired: { company: 'Hired · working', individual: 'Hired', tone: 'green' },
  Claimed: { company: 'Payment claimed', individual: 'Claimed', tone: 'amber' },
  Paid: { company: 'Paid', individual: 'Paid', tone: 'green' },
  Declined: { company: 'Declined', individual: 'Not selected', tone: 'red' },
}

/** Tabs on the Applications page, in the order work happens. */
export const stageTabs: { stage?: ApplicationStage; company: string; individual: string }[] = [
  { company: 'All', individual: 'All' },
  { stage: 'New', company: 'New', individual: 'Applied' },
  { stage: 'Hired', company: 'Working', individual: 'Hired' },
  { stage: 'Claimed', company: 'To pay', individual: 'Claimed' },
  { stage: 'Paid', company: 'Paid', individual: 'Paid' },
  { stage: 'Declined', company: 'Declined', individual: 'Not selected' },
]

/** Kept for places that only know the raw status. */
export const applicationStatusMeta: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  Pending: { label: 'Applied', tone: 'brand' },
  Accepted: { label: 'Hired', tone: 'green' },
  Rejected: { label: 'Not selected', tone: 'red' },
  Completed: { label: 'Paid', tone: 'green' },
}

export const withdrawalStatusMeta: Record<WithdrawalStatus, { label: string; tone: Tone }> = {
  Pending: { label: 'Pending', tone: 'amber' },
  Paid: { label: 'Done', tone: 'green' },
  Rejected: { label: 'Rejected', tone: 'red' },
}

/** The four steps of one job, in order. Post types without payments stop at Hired. */
export const jobSteps = ['Applied', 'Hired', 'Claimed', 'Paid'] as const
export const jobStepsWithoutPayments = ['Applied', 'Hired'] as const

/** How many steps are done: 1 = applied … 4 = paid. */
export function stepsDone(status: ApplicationStatus, claimed: boolean) {
  if (status === 'Completed') return 4
  if (status === 'Accepted') return claimed ? 3 : 2
  return 1
}

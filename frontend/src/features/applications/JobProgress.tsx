import { cn } from '@/lib/cn'
import type { ApplicationStatus } from '@/lib/types'
import { jobSteps, stepsDone } from './labels'

/** Applied → Hired → Claimed → Paid as a slim bar, so both sides see at a glance how far a job has come. */
export function JobProgress({ status, claimed, className }: { status: ApplicationStatus; claimed: boolean; className?: string }) {
  const done = stepsDone(status, claimed)

  return (
    <ol className={cn('grid grid-cols-4 gap-1', className)} aria-label={`Step ${done} of ${jobSteps.length}: ${jobSteps[done - 1]}`}>
      {jobSteps.map((step, i) => {
        const complete = i < done
        return (
          <li key={step} className="min-w-0">
            <span aria-hidden className={cn('block h-1 rounded-full', complete ? 'bg-emerald-500' : 'bg-slate-200')} />
            <span className={cn('mt-1 block truncate text-[11px]', i === done - 1 ? 'font-semibold text-slate-700' : 'text-slate-400')}>{step}</span>
          </li>
        )
      })}
    </ol>
  )
}

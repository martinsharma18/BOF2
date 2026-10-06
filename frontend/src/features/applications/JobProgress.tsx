import { cn } from '@/lib/cn'
import type { ApplicationStatus } from '@/lib/types'
import { jobSteps, jobStepsWithoutPayments, stepsDone } from './labels'

/**
 * Applied → Hired → Claimed → Paid as a slim bar, so both sides see at a glance how far a job has come.
 * Post types without payments (see postTypeHasPayments) show only Applied → Hired.
 */
export function JobProgress({
  status,
  claimed,
  payments = true,
  className,
}: {
  status: ApplicationStatus
  claimed: boolean
  payments?: boolean
  className?: string
}) {
  const steps: readonly string[] = payments ? jobSteps : jobStepsWithoutPayments
  const done = Math.min(stepsDone(status, claimed), steps.length)

  return (
    <ol
      className={cn('grid gap-1', payments ? 'grid-cols-4' : 'grid-cols-2', className)}
      aria-label={`Step ${done} of ${steps.length}: ${steps[done - 1]}`}
    >
      {steps.map((step, i) => {
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

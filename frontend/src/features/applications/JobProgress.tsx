import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ApplicationStatus } from '@/lib/types'
import { jobSteps, stepsDone } from './labels'

/** Applied → Hired → Claimed → Paid, so both sides always know where a job stands. */
export function JobProgress({ status, claimed, className }: { status: ApplicationStatus; claimed: boolean; className?: string }) {
  const declined = status === 'Rejected'
  const done = stepsDone(status, claimed)

  return (
    <ol className={cn('flex items-center', className)} aria-label="Job progress">
      {jobSteps.map((step, i) => {
        const complete = i < done
        const isDeclinedStep = declined && i === 1
        const current = !declined && i === done && done < jobSteps.length
        return (
          <li key={step} className={cn('flex items-center', i > 0 && 'flex-1')}>
            {i > 0 && (
              <span
                aria-hidden
                className={cn('mx-1.5 h-0.5 flex-1 rounded-full sm:mx-2', complete ? 'bg-emerald-500' : 'bg-slate-200')}
              />
            )}
            <span className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white',
                  complete && 'bg-emerald-500 text-white',
                  isDeclinedStep && 'bg-red-500 text-white',
                  current && 'bg-accent-500 text-white',
                  !complete && !isDeclinedStep && !current && 'bg-slate-200 text-slate-500',
                )}
              >
                {complete ? <Check className="size-3.5" /> : isDeclinedStep ? <X className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-[11px] font-semibold whitespace-nowrap',
                  complete ? 'text-emerald-700' : isDeclinedStep ? 'text-red-600' : current ? 'text-accent-700' : 'text-slate-400',
                )}
              >
                {isDeclinedStep ? 'Declined' : step}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

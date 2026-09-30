import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { getErrorMessage, getProblem } from './api'

/**
 * Pushes server-side validation errors (PascalCase keys) onto matching form fields.
 * Returns a general message when some errors don't map to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): string | null {
  const problem = getProblem(error)
  if (!problem?.errors) return getErrorMessage(error)

  const unmatched: string[] = []
  for (const [key, messages] of Object.entries(problem.errors)) {
    const field = key.charAt(0).toLowerCase() + key.slice(1)
    if (fields.includes(field)) {
      setError(field as Path<T>, { type: 'server', message: messages[0] })
    } else {
      unmatched.push(...messages)
    }
  }
  return unmatched.length ? unmatched.join(' ') : null
}

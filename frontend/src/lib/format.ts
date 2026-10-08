/** Evaluated once at load; fine for footers. */
export const currentYear = new Date().getFullYear()

const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

export function formatMoney(value: number) {
  return `Rs. ${number.format(value)}`
}

export function formatCompact(value: number) {
  return compact.format(value)
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function ageFrom(dateOfBirth: string) {
  const [y, m, d] = dateOfBirth.split('-').map(Number)
  const today = new Date()
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
  return age
}

/** YYYY-MM-DD for `years` ago today, for date input min/max. */
export function yearsAgo(years: number) {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return date.toISOString().slice(0, 10)
}

/** Formats a YYYY-MM-DD date without shifting it across time zones. */
export function formatDay(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${formatCompact(count)} ${count === 1 ? singular : plural}`
}

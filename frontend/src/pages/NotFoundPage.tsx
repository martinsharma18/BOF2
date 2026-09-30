import { ButtonLink } from '@/components/ui'
import { Logo } from '@/components/layout/Logo'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="mt-10 font-display text-7xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-3 text-2xl font-bold">We couldn't find that page</h1>
      <p className="mt-2 text-slate-500">The link may be broken or the page may have been removed.</p>
      <ButtonLink to="/" className="mt-8">
        Go home
      </ButtonLink>
    </div>
  )
}

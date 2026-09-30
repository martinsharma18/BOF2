import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { APP_NAME } from '@/lib/brand'

// TODO: wire to a reset-password endpoint once an email provider (SMTP / SendGrid) is chosen.
export function ForgotPasswordPage() {
  useDocumentTitle('Forgot password')
  return (
    <AuthLayout title="Reset your password">
      <Alert tone="info">
        Password reset by email is coming soon. Until then, please contact {APP_NAME} support and we'll reset it for you.
      </Alert>
      <p className="mt-8 text-center text-sm">
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          ← Back to log in
        </Link>
      </p>
    </AuthLayout>
  )
}

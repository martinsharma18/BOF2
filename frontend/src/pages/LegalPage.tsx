import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { APP_NAME } from '@/lib/brand'
import { currentYear } from '@/lib/format'

function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  useDocumentTitle(title)
  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo />
          <Link to="/register" className="text-sm font-semibold text-brand-600 hover:underline">
            Create account
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">Last updated {updated}</p>
        <div className="mt-8 space-y-6 leading-relaxed text-slate-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </main>
      <footer className="border-t border-slate-100 py-6 text-center text-sm text-slate-500">
        © {currentYear} {APP_NAME} · <Link to="/terms" className="hover:underline">Terms</Link> ·{' '}
        <Link to="/privacy" className="hover:underline">Privacy</Link>
      </footer>
    </div>
  )
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="29 September 2026">
      <p>
        These terms apply to everyone who uses {APP_NAME}. Companies post opportunities, and individuals apply to or claim them. By creating an account you
        agree to these terms.
      </p>
      <h2>Accounts</h2>
      <ul>
        <li>Give true information when you register. Company accounts must represent a real business.</li>
        <li>Keep your password safe. You are responsible for activity on your account.</li>
        <li>We may disable accounts that break these terms, post misleading opportunities or misuse other people's data.</li>
      </ul>
      <h2>Posts and applications</h2>
      <ul>
        <li>Companies are responsible for the accuracy of their posts: number of people, payment, gender and area.</li>
        <li>When you apply, the company can see your profile and contact details so they can reach you.</li>
        <li>Discrimination, harassment, scams and illegal work are not allowed.</li>
      </ul>
      <h2>Payments and withdrawals</h2>
      <ul>
        <li>Payments a company releases are added to the individual's wallet balance.</li>
        <li>Withdrawals are reviewed and paid by our admin team to the bank or wallet account you enter. Check your account details carefully.</li>
        <li>We may hold or reject a withdrawal if the details look wrong or fraudulent, and will tell you why.</li>
      </ul>
      <h2>Contact</h2>
      <p>For questions about these terms, contact the {APP_NAME} support team.</p>
    </LegalLayout>
  )
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="29 September 2026">
      <p>This policy explains what {APP_NAME} collects and how it is used.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email, phone numbers, gender, province and district, company name.</li>
        <li>What you create: posts, photos, applications, messages, reactions and feedback.</li>
        <li>Withdrawal details: bank or wallet name, account name and number. Only you and our admins can see them.</li>
      </ul>
      <h2>Who can see it</h2>
      <ul>
        <li>Your public profile (name, photo, bio, location) is visible to signed-in users.</li>
        <li>Your email and phone numbers are shared only with companies you apply to.</li>
        <li>Messages on an application are visible only to you, that company and our admins.</li>
      </ul>
      <h2>Your choices</h2>
      <p>You can edit your profile at any time in Settings. To delete your account, contact support.</p>
    </LegalLayout>
  )
}

import type { ReactNode } from 'react'
import { ArrowRight, Banknote, Building2, Hand, MapPin, PenSquare, Send, UserRound, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/components/ui'
import { Logo } from '@/components/layout/Logo'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { APP_NAME } from '@/lib/brand'
import { currentYear } from '@/lib/format'

const steps = [
  { icon: <PenSquare className="size-5" />, title: 'Companies post', text: 'Add a photo, how many people you need, the maximum payment, gender and area.' },
  { icon: <Send className="size-5" />, title: 'People apply', text: 'Individuals send a short message with their profile. The company is notified instantly and can chat with them.' },
  { icon: <Hand className="size-5" />, title: 'Accept, claim, get paid', text: 'Once accepted, the person taps Claim to request payment. The company pays and they cash out to their bank or wallet.' },
]

const provinces = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim']

export function LandingPage() {
  useDocumentTitle('Find work and hire people across Nepal')

  return (
    <div className="min-h-dvh bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <ButtonLink to="/login" variant="ghost">
              Log in
            </ButtonLink>
            <ButtonLink to="/register">Get started</ButtonLink>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-x-0 -top-40 -z-0 h-[36rem] bg-gradient-to-b from-brand-50 via-white to-white" />
        <div aria-hidden className="absolute top-10 -right-32 size-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-card ring-1 ring-brand-100">
              <MapPin className="size-3.5" /> Built for all 77 districts of Nepal
            </span>
            <h1 className="mt-6 text-4xl leading-[1.1] font-extrabold sm:text-5xl lg:text-6xl">
              Post what you need.
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                Get the right people.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-600">
              {APP_NAME} connects companies and individuals across Nepal. Companies post opportunities, people apply in one tap, and
              payments land straight in their wallet.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/register" size="lg" icon={<ArrowRight className="size-5" />} className="flex-row-reverse">
                Create free account
              </ButtonLink>
              <ButtonLink to="/login" size="lg" variant="secondary">
                I already have an account
              </ButtonLink>
            </div>
          </div>

          {/* Product preview */}
          <div className="relative mx-auto w-full max-w-md animate-fade-in lg:mr-0" aria-hidden>
            <div className="absolute -inset-4 -rotate-3 rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 opacity-15" />
            <div className="relative rounded-2xl bg-white p-5 shadow-pop ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">HT</span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">Himal Traders</p>
                  <p className="text-xs text-slate-500">Company · 2h ago</p>
                </div>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">Type 1</span>
              </div>
              <p className="mt-4 text-lg font-bold text-slate-900">5 helpers needed for a 3-day event</p>
              <p className="mt-1 text-sm text-slate-600">Setting up stalls, guiding visitors and packing up. Lunch provided every day.</p>
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-200/70 text-sm">
                {[
                  [<Users key="u" className="size-4" />, 'People', '5+'],
                  [<Wallet key="w" className="size-4" />, 'Max payment', 'Rs. 25,000'],
                  [<UserRound key="g" className="size-4" />, 'Gender', 'Male & Female'],
                  [<MapPin key="m" className="size-4" />, 'Location', 'Lalitpur'],
                ].map(([icon, label, value]) => (
                  <div key={label as string} className="flex gap-2 bg-slate-50 px-3 py-2">
                    <span className="mt-0.5 text-brand-500">{icon}</span>
                    <div>
                      <p className="text-[10px] font-medium text-slate-500 uppercase">{label}</p>
                      <p className="font-semibold text-slate-900">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
                <span className="flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 text-white">
                  <Send className="size-4" /> Apply
                </span>
                <span className="flex h-10 items-center justify-center gap-2 rounded-lg bg-accent-500 text-white">
                  <Hand className="size-4" /> Claim
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
                <span>👍 ❤️ 😮 &nbsp;24</span>
                <span>12 applications</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">How {APP_NAME} works</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-500">Three simple steps from post to payment.</p>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200/70">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white">{s.icon}</span>
                  <span className="text-sm font-semibold text-slate-400">Step {i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Audiences */}
      <section className="py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2">
          <Audience
            icon={<Building2 className="size-6" />}
            title="For companies"
            text="Post opportunities with a photo, budget, gender and area. Review each applicant's profile, chat with them, accept and pay, all in one place."
            cta="Register your company"
            to="/register?type=company"
          />
          <Audience
            icon={<UserRound className="size-6" />}
            title="For individuals"
            text="Find opportunities near you, apply with a message or claim in one tap, and cash out what you earn to eSewa, Khalti or your bank."
            cta="Create personal account"
            to="/register"
            extra={
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700 ring-1 ring-accent-200">
                <Banknote className="size-3.5" /> Built-in wallet & cash withdraw
              </span>
            }
          />
        </div>
      </section>

      {/* Coverage */}
      <section className="bg-brand-950 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">Across every province</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-200">Filter posts by province and district, or reach people from anywhere in Nepal.</p>
          <ul className="mt-10 flex flex-wrap justify-center gap-3">
            {provinces.map((p) => (
              <li key={p} className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/15">
                {p}
              </li>
            ))}
          </ul>
          <ButtonLink to="/register" size="lg" variant="secondary" className="mt-12">
            Join {APP_NAME}. It's free
          </ButtonLink>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo />
          <p>© {currentYear} {APP_NAME}. Made in Nepal.</p>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-slate-800">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-slate-800">
              Privacy
            </Link>
            <Link to="/login" className="hover:text-slate-800">
              Log in
            </Link>
            <Link to="/register" className="hover:text-slate-800">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Audience({ icon, title, text, cta, to, extra }: { icon: ReactNode; title: string; text: string; cta: string; to: string; extra?: ReactNode }) {
  return (
    <div className="group rounded-3xl bg-gradient-to-br from-slate-50 to-white p-8 ring-1 ring-slate-200 transition hover:ring-brand-300">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon}</span>
      <h3 className="mt-6 text-2xl font-bold">{title}</h3>
      <p className="mt-3 text-slate-600">{text}</p>
      {extra}
      <Link to={to} className="mt-6 inline-flex items-center gap-1.5 font-semibold text-brand-600 group-hover:gap-2.5 transition-all">
        {cta} <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}

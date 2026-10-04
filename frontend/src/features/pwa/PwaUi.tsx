import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { BellRing, Download, Share, SquarePlus, WifiOff, X } from 'lucide-react'
import { Button, Dialog, toast } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { APP_NAME } from '@/lib/brand'
import { readFlag, useInstall, useOnline, writeFlag } from './pwa'
import { syncPush, usePush, type PushState } from './push'

/**
 * Listens to the service worker: a push arrived (refresh badges/lists now) or a notification was tapped
 * (route there inside the app). Also re-links this device for push after sign-in.
 */
export function PwaBridge() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (event: MessageEvent<{ type?: string; url?: string }>) => {
      if (event.data?.type === 'push') {
        for (const key of ['notifications', 'inbox', 'applications', 'wallet']) void queryClient.invalidateQueries({ queryKey: [key] })
      }
      if (event.data?.type === 'open' && event.data.url) navigate(event.data.url)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [queryClient, navigate])

  useEffect(() => {
    if (user) void syncPush()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

/** Thin strip at the top while the phone has no connection. */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-slate-800 px-4 py-1.5 text-xs font-medium text-white">
      <WifiOff className="size-3.5" /> You are offline. Showing what was already loaded.
    </div>
  )
}

const INSTALL_DISMISSED = 'bof2.install-dismissed'

/** One-time card on phones: "Install the app". Hidden once installed or dismissed. */
export function InstallBanner() {
  const { canPrompt, needsIosSteps, install } = useInstall()
  const [dismissed, setDismissed] = useState(() => readFlag(INSTALL_DISMISSED))
  const [iosOpen, setIosOpen] = useState(false)
  if (dismissed || (!canPrompt && !needsIosSteps)) return null

  const close = () => {
    writeFlag(INSTALL_DISMISSED)
    setDismissed(true)
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-3 pl-4 text-white shadow-card lg:hidden">
      <img src="/icons/icon-192.png" alt="" className="size-10 shrink-0 rounded-xl bg-white" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install {APP_NAME} on your phone</p>
        <p className="text-xs text-brand-100">Opens like an app, loads faster, sends job alerts.</p>
      </div>
      <Button
        variant="accent"
        size="sm"
        onClick={async () => {
          if (canPrompt) {
            if (await install()) close()
          } else setIosOpen(true)
        }}
      >
        Install
      </Button>
      <button type="button" onClick={close} aria-label="Not now" className="-mr-1 rounded-lg p-1.5 text-brand-100 active:bg-white/10">
        <X className="size-4" />
      </button>
      <IosInstallDialog open={iosOpen} onClose={() => setIosOpen(false)} />
    </div>
  )
}

/** "Install app" row for the phone menu; renders nothing when there is nothing to install. */
export function InstallMenuItem() {
  const { canPrompt, needsIosSteps, install } = useInstall()
  const [iosOpen, setIosOpen] = useState(false)
  if (!canPrompt && !needsIosSteps) return null
  return (
    <li>
      <button
        type="button"
        onClick={() => (canPrompt ? void install() : setIosOpen(true))}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-brand-700 active:bg-brand-50"
      >
        <Download className="size-5" />
        Install app
      </button>
      <IosInstallDialog open={iosOpen} onClose={() => setIosOpen(false)} />
    </li>
  )
}

function IosInstallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title={`Install ${APP_NAME}`} description="On iPhone it takes two taps in Safari.">
      <ol className="space-y-4 text-[15px] text-slate-700">
        <li className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Share className="size-5" />
          </span>
          <span>
            Tap the <b>Share</b> button at the bottom of Safari.
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <SquarePlus className="size-5" />
          </span>
          <span>
            Choose <b>Add to Home Screen</b>, then <b>Add</b>.
          </span>
        </li>
      </ol>
      <p className="mt-5 text-sm text-slate-500">Open {APP_NAME} from the new icon to get notifications on your iPhone.</p>
    </Dialog>
  )
}

const pushText: Record<Exclude<PushState, 'loading'>, string> = {
  on: 'This phone gets a notification when you are hired, paid, messaged or invited.',
  off: 'Get a notification on this phone when you are hired, paid, messaged or invited, even when the app is closed.',
  blocked: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then come back.',
  unsupported: isIosBrowser()
    ? 'On iPhone, first install the app (Share → Add to Home Screen) and open it from the icon.'
    : 'This browser can’t show notifications. Try Chrome on Android.',
  unavailable: 'Phone notifications are not set up on the server yet.',
}

function isIosBrowser() {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** Settings card: turn phone notifications on or off for this device. */
export function PushSettings() {
  const push = usePush()
  if (push.state === 'loading') return <p className="text-sm text-slate-400">Checking…</p>

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <p className="flex-1 text-sm text-slate-600">{pushText[push.state]}</p>
      {push.state === 'on' && (
        <Button variant="secondary" loading={push.busy} onClick={() => void push.disable().then(() => toast.success('Phone notifications turned off'))}>
          Turn off
        </Button>
      )}
      {push.state === 'off' && (
        <Button icon={<BellRing className="size-4" />} loading={push.busy} onClick={() => void enableWithToast(push.enable)}>
          Turn on
        </Button>
      )}
    </div>
  )
}

async function enableWithToast(enable: () => Promise<void>) {
  try {
    await enable()
  } catch {
    toast.error('Could not turn on notifications. Please try again.')
  }
}

const PUSH_PROMPT_DISMISSED = 'bof2.push-prompt-dismissed'

/** Gentle prompt above the notifications list until the person turns push on or says "not now". */
export function PushPrompt() {
  const push = usePush()
  const [dismissed, setDismissed] = useState(() => readFlag(PUSH_PROMPT_DISMISSED))
  if (dismissed || push.state !== 'off') return null

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl bg-accent-50 p-4 ring-1 ring-accent-100">
      <BellRing className="mt-0.5 size-5 shrink-0 text-accent-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">Get alerts on your phone</p>
        <p className="mt-0.5 text-sm text-slate-600">Know right away when you are hired, paid or messaged.</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="accent" loading={push.busy} onClick={() => void enableWithToast(push.enable)}>
            Turn on
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              writeFlag(PUSH_PROMPT_DISMISSED)
              setDismissed(true)
            }}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  )
}

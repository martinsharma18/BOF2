import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

/**
 * Phone notifications (Web Push). The browser gives us a subscription (an endpoint + keys); the API stores
 * it against the signed-in user and sends a push whenever that user gets a notification or inbox message.
 */

export type PushState =
  | 'loading'
  /** Browser can't do push (or iPhone not installed to the home screen yet). */
  | 'unsupported'
  /** The server has no push keys configured. */
  | 'unavailable'
  /** The person blocked notifications for this site in the browser. */
  | 'blocked'
  | 'off'
  | 'on'

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

let publicKey: Promise<string | null> | null = null
const getPublicKey = () =>
  (publicKey ??= api
    .get<{ publicKey: string | null }>('/push/public-key')
    .then((r) => r.data.publicKey)
    .catch(() => {
      publicKey = null
      return null
    }))

async function currentSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

function toServer(sub: PushSubscription) {
  const json = sub.toJSON()
  return { endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' }
}

/** Base64url VAPID key → bytes for pushManager.subscribe. */
function keyBytes(base64url: string) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

/** Asks permission (must run from a tap) and registers this device. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  const key = await getPublicKey()
  if (!key) return 'unavailable'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'

  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }))
  await api.post('/push/subscriptions', toServer(sub))
  return 'on'
}

/** Stops pushes to this device for everyone. */
export async function disablePush(): Promise<PushState> {
  const sub = await currentSubscription()
  if (sub) {
    await api.post('/push/subscriptions/remove', { endpoint: sub.endpoint }).catch(() => undefined)
    await sub.unsubscribe()
  }
  return 'off'
}

/**
 * On sign-in: if this device already allowed notifications, (re)link it to whoever is signed in now.
 * The browser subscription can also rotate on its own, so this keeps the server copy fresh.
 */
export async function syncPush() {
  if (!pushSupported() || Notification.permission !== 'granted') return
  const sub = await currentSubscription()
  if (sub) await api.post('/push/subscriptions', toServer(sub)).catch(() => undefined)
}

/** On sign-out: stop sending this account's notifications to this device (needs the token, so call first). */
export async function unlinkPush() {
  const sub = await currentSubscription().catch(() => null)
  if (sub) await api.post('/push/subscriptions/remove', { endpoint: sub.endpoint }).catch(() => undefined)
}

export function usePush() {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      let next: PushState
      if (!pushSupported()) next = 'unsupported'
      else if (Notification.permission === 'denied') next = 'blocked'
      else if (!(await getPublicKey())) next = 'unavailable'
      else next = Notification.permission === 'granted' && (await currentSubscription()) ? 'on' : 'off'
      if (alive) setState(next)
    })()
    return () => {
      alive = false
    }
  }, [])

  const run = useCallback(async (action: () => Promise<PushState>) => {
    setBusy(true)
    try {
      setState(await action())
    } finally {
      setBusy(false)
    }
  }, [])

  return { state, busy, enable: () => run(enablePush), disable: () => run(disablePush) }
}

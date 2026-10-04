/*
 * Feedora service worker: makes the site installable, opens fast on slow mobile data, keeps working
 * offline with what was already loaded, and shows push notifications.
 *
 * Caching rules (the API is never cached, so data is always live):
 *   page loads      network first (4 s), then the saved app shell when offline
 *   /assets/*       cache first: Vite gives them hashed, never-changing names
 *   /uploads/*      show the saved copy at once, refresh in the background (capped)
 *   icons, fonts    same as uploads
 */
const SHELL = 'feedora-shell-v1'
const ASSETS = 'feedora-assets-v1'
const IMAGES = 'feedora-images-v1'
const FONTS = 'feedora-fonts-v1'
const KNOWN = [SHELL, ASSETS, IMAGES, FONTS]

const SHELL_FILES = ['/index.html', '/manifest.webmanifest', '/logo.png', '/icons/icon-192.png', '/icons/badge-96.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(SHELL_FILES)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!KNOWN.includes(key)) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (url.origin === self.location.origin) {
    const path = url.pathname
    // Live data and dev-server files are never cached.
    if (path.startsWith('/api/') || path.startsWith('/scalar') || path === '/health' || path.startsWith('/@') || path.startsWith('/src/') || path.startsWith('/node_modules/'))
      return
    if (request.mode === 'navigate') return event.respondWith(pageNetworkFirst(request))
    if (path.startsWith('/assets/')) return event.respondWith(cacheFirst(request, ASSETS))
    if (path.startsWith('/uploads/')) return event.respondWith(staleWhileRevalidate(request, IMAGES, 200))
    if (/\.(png|jpg|jpeg|webp|svg|ico|webmanifest)$/.test(path)) return event.respondWith(staleWhileRevalidate(request, SHELL))
    return
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com')
    event.respondWith(staleWhileRevalidate(request, FONTS, 30))
})

/** Every route is the same single-page app, so one saved index.html serves them all offline. */
async function pageNetworkFirst(request) {
  const cache = await caches.open(SHELL)
  const network = fetch(request).then((response) => {
    if (response.ok && (response.headers.get('content-type') || '').includes('text/html'))
      cache.put('/index.html', response.clone())
    return response
  })
  network.catch(() => undefined) // handled below; avoid an unhandled rejection after a timeout
  const timeout = new Promise((resolve) => setTimeout(resolve, 4000))
  try {
    const first = await Promise.race([network, timeout])
    if (first) return first
    // Slow network: show the saved shell now; the fetch above still refreshes it for next time.
    const saved = await cache.match('/index.html')
    return saved || (await network)
  } catch {
    return (await cache.match('/index.html')) || offlinePage()
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const saved = await cache.match(request)
  if (saved) return saved
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const saved = await cache.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok || response.type === 'opaque') {
        await cache.put(request, response.clone())
        if (maxEntries) await trim(cache, maxEntries)
      }
      return response
    })
    .catch(() => saved || Response.error())
  return saved || network
}

/** Drops the oldest entries so image caches don't fill a cheap phone's storage. */
async function trim(cache, maxEntries) {
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - maxEntries; i++) await cache.delete(keys[i])
}

function offlinePage() {
  return new Response(
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>' +
      '<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#334155;text-align:center;padding:16px">' +
      '<div><h1 style="font-size:20px">You are offline</h1><p>Check your internet connection and try again.</p>' +
      '<button onclick="location.reload()" style="padding:12px 20px;border:0;border-radius:10px;background:#0047b1;color:#fff;font-size:16px">Try again</button></div>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

// ---- Push notifications ----------------------------------------------------------------------

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || 'Feedora', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-96.png',
        tag: data.tag,
        data: { url: data.url || '/notifications' },
      })
      // Open tabs refresh their badges and lists right away instead of waiting for the next poll.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) client.postMessage({ type: 'push' })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/notifications'

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((c) => new URL(c.url).origin === self.location.origin)
      if (open) {
        // Let the app route there itself (no full reload).
        open.postMessage({ type: 'open', url })
        return open.focus()
      }
      return self.clients.openWindow(url)
    })(),
  )
})

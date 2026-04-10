/**
 * VERDICT Service Worker
 * In production, CACHE_NAME is unique per build via __BUILD_TIME__.
 * In dev, it stays fixed as 'verdict-dev' so HMR restarts never
 * trigger a new SW install + reload cycle.
 */

const CACHE_NAME = 'verdict-' + (typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev')

const APP_SHELL = ['/', '/index.html']

// Install: pre-cache app shell.
// NO skipWaiting() here — if we skip waiting immediately, the browser fires
// controllerchange on every single load which used to cause infinite reloads.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
    // Intentionally NOT calling self.skipWaiting() here.
    // The new SW will activate on next navigation naturally.
  )
})

// Activate: delete ALL old caches, claim clients.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k)
          return caches.delete(k)
        })
      ))
      .then(() => self.clients.claim())
  )
})

// Fetch: network-first for API + WS, cache-first for static assets.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Never intercept: API, WebSocket, chrome-extension, cross-origin
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/topic') ||
    event.request.url.startsWith('chrome-extension') ||
    !event.request.url.startsWith(self.location.origin)
  ) return

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request)
        .then(resp => {
          if (!resp || resp.status !== 200 || event.request.method !== 'GET') return resp
          const clone = resp.clone()
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
          return resp
        })
        .catch(() => caches.match('/index.html'))
    })
  )
})

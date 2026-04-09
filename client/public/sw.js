/**
 * VERDICT Service Worker
 * Strategy: cache-first for app shell, network-first for API/WS.
 * Version bump the CACHE_NAME to force refresh on deploy.
 */
const CACHE_NAME = 'verdict-v1'

const APP_SHELL = [
  '/',
  '/index.html',
]

// Install: pre-cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

// Activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch: network-first for API + WS, cache-first for everything else
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Never intercept API, WebSocket, or cross-origin requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/topic') ||
    event.request.url.startsWith('chrome-extension') ||
    !url.origin.includes(self.location.origin)
  ) return

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request)
        .then(resp => {
          // Only cache successful GET responses
          if (!resp || resp.status !== 200 || event.request.method !== 'GET') return resp
          const clone = resp.clone()
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
          return resp
        })
        .catch(() => caches.match('/index.html')) // offline fallback
    })
  )
})

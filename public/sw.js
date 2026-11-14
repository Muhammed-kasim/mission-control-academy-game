const CACHE_NAME = 'mission-control-academy-v1'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/mission-control-icon.svg',
  '/mission-control-icon-192.png',
  '/mission-control-icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(APP_SHELL)
    const response = await fetch('/')
    const html = await response.text()
    const assets = [...html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g)]
      .map((match) => new URL(match[1], self.location.origin))
      .filter((url) => url.origin === self.location.origin)
      .map((url) => url.href)
    if (assets.length) await cache.addAll([...new Set(assets)])
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('mission-control-academy-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)))
          }
          return response
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match('/'))),
    )
    return
  }

  if (url.pathname.startsWith('/_next/static/') || APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)))
        }
        return response
      }).catch(async () => (await caches.match(request)) ?? Response.error()),
    )
  }
})

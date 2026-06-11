// Service Worker — TripMate PWA
// Caches app shell + trip data; enables offline ticket viewing

const CACHE_VERSION = 'v1'
const SHELL_CACHE = `shell-${CACHE_VERSION}`
const DATA_CACHE = `data-${CACHE_VERSION}`
const FILES_CACHE = `files-${CACHE_VERSION}`

const SHELL_ASSETS = [
  '/',
  '/login',
  '/_next/static/',
]

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      cache.addAll(['/', '/login', '/offline'])
    ).then(() => self.skipWaiting())
  )
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![SHELL_CACHE, DATA_CACHE, FILES_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and Supabase API calls (handled by app)
  if (request.method !== 'GET') return
  if (url.hostname.includes('supabase.co')) return

  // File attachments — cache-first for offline ticket viewing
  if (url.pathname.includes('/storage/v1/object/')) {
    event.respondWith(cacheFirst(request, FILES_CACHE))
    return
  }

  // Next.js static assets — cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, SHELL_CACHE))
    return
  }

  // API routes — network-first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DATA_CACHE))
    return
  }

  // Pages — network-first with shell fallback for offline
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then(r => r ?? caches.match('/'))
    )
  )
})

// Cache-first strategy: serve from cache, refresh in background
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
  }
  return response
}

// Network-first strategy: try network, fall back to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    throw new Error('Offline and no cache available')
  }
}

// Listen for cache-file messages from app (for offline ticket storage)
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'CACHE_FILE') {
    const { url, cacheName = FILES_CACHE } = event.data
    const cache = await caches.open(cacheName)
    try {
      await cache.add(url)
      event.ports[0]?.postMessage({ success: true })
    } catch (err) {
      event.ports[0]?.postMessage({ success: false, error: err.message })
    }
  }
})

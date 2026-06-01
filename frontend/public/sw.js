const CACHE    = 'chatapp-v1'
const PRECACHE = ['/', '/index.html', '/manifest.json']

// ── Install: cache app shell ──────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// ── Activate: clear old caches ────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first for API, cache-first for assets ──────────────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Never intercept WebSocket or API calls
  if (url.pathname.startsWith('/ws') || url.port === '8000') return

  // Cache-first for static assets
  if (e.request.destination === 'script'  ||
      e.request.destination === 'style'   ||
      e.request.destination === 'image'   ||
      e.request.destination === 'font') {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
          return res
        })
      )
    )
    return
  }

  // Network-first for HTML (so updates land immediately)
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// ── Push notification received ────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return
  const data  = e.data.json()
  const title = data.title || 'New message'
  const opts  = {
    body : data.body  || '',
    icon : '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data : data.data  || {},
    vibrate   : [100, 50, 100],
    renotify  : true,
    tag       : `msg-${data.data?.sender_id || 'chat'}`,
    actions   : [{ action: 'open', title: 'Open chat' }],
  }
  e.waitUntil(self.registration.showNotification(title, opts))
})

// ── Notification click: open/focus the app ────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const senderId = e.notification.data?.sender_id
  const target   = senderId ? `/chat/${senderId}` : '/chat'

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes('/chat'))
      if (existing) {
        existing.focus()
        existing.navigate(target)
      } else {
        clients.openWindow(target)
      }
    })
  )
})

// ── Background sync: flush offline message queue ──────────────────────────────
self.addEventListener('sync', (e) => {
  if (e.tag === 'flush-queue') {
    e.waitUntil(
      self.clients.matchAll().then((list) => {
        list.forEach((c) => c.postMessage({ type: 'flush_queue' }))
      })
    )
  }
})
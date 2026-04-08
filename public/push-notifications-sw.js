/* global self */
/**
 * Supplemental service worker script (imported by Workbox-generated SW).
 * Handles push display; server-side sending is configured separately (e.g. Edge Function).
 */
self.addEventListener('push', function (event) {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Project Nidus', body: event.data ? event.data.text() : 'New notification' }
  }
  const title = data.title || 'Project Nidus'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'nidus-default',
    data: data.data || {},
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const c = clientList[i]
        if (c.url && 'focus' in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

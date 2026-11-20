/*
 * AiCha service worker: it only shows push notifications and opens the app when one is tapped. It caches nothing and does not
 * touch page requests, so it can never serve an old page.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  // Every push must show something (browsers refuse silent pushes), so fall back to a plain title.
  const title = typeof data.title === 'string' && data.title ? data.title : 'AiCha';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof data.body === 'string' ? data.body : '',
      icon: '/brand/icon-192.png',
      // A newer notification with the same tag replaces the old one, and tells the person again.
      tag: typeof data.tag === 'string' ? data.tag : undefined,
      renotify: typeof data.tag === 'string',
      lang: data.lang === 'bn' ? 'bn' : 'en',
      data: { url: typeof data.url === 'string' ? data.url : '/cards' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Only ever go to a page of this site, whatever the notification says.
  let target = new URL('/cards', self.location.origin);
  try {
    const wanted = new URL((event.notification.data && event.notification.data.url) || '/cards', self.location.origin);
    if (wanted.origin === self.location.origin) target = wanted;
  } catch (e) {
    /* keep the default */
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
          // A window this worker does not control cannot be navigated: then open the page in a new window instead.
          return w
            .focus()
            .then((focused) => (focused && 'navigate' in focused ? focused.navigate(target.href) : null))
            .catch(() => self.clients.openWindow(target.href));
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});

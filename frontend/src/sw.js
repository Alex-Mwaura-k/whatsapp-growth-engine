import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//],
  })
);

const setBadge = (count) => {
  const nav = self.navigator;
  if (!nav) return Promise.resolve();
  if (count > 0 && nav.setAppBadge) return nav.setAppBadge(count).catch(() => {});
  if (nav.clearAppBadge) return nav.clearAppBadge().catch(() => {});
  return Promise.resolve();
};

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || 'Growth Engine';
  const options = {
    body: data.body || 'You have a new update.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'batch-ready',
    data: { url: data.url || '/download' },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      setBadge(Number(data.count) || 1),
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => clients.forEach((client) => client.postMessage({ type: 'push-received' }))),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Only same-origin paths are allowed as a target.
  const requested = event.notification.data?.url || '/download';
  const target = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/download';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          return client.focus().then((focused) => ('navigate' in focused ? focused.navigate(target) : focused));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

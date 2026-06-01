const CACHE_NAME = 'voice-business-tracker-v3';
const APP_SHELL = [
  '/',
  '/react.html',
  '/manifest.webmanifest',
  '/assets/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match('/react.html'));

      return cached || network;
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'vbt-background-sync') {
    event.waitUntil(self.registration.showNotification('Voice Business Tracker', {
      body: 'Offline entries are ready to sync when cloud backup is connected.',
      icon: '/assets/logo.svg'
    }));
  }
});

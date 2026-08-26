/* ═══════════════════════════════════════════════════════════════
   MTG ARENA SOCIAL — Service Worker for PWA Mobile Support
   Network-first strategy with offline fallback
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'mtg-arena-social-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (!url.startsWith('http')) return;

  if (url.includes('/socket.io/') ||
      url.includes('/api/') ||
      url.includes('googleapis.com') ||
      url.includes('gstatic.com') ||
      url.includes('scryfall.com') ||
      url.includes('jsdelivr.net') ||
      url.includes('fonts.googleapis') ||
      url.includes('fonts.gstatic')) {
    return;
  }

  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          try {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            }).catch(() => {});
          } catch(e) {}
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          if (event.request.mode === 'navigate' || event.request.destination === 'document') {
            return caches.match('/index.html').then((shell) => {
              if (shell) return shell;
              return new Response('<!DOCTYPE html><html><body><h1>Offline</h1></body></html>', {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              });
            });
          }

          return new Response('', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        }).catch(() => {
          return new Response('', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});

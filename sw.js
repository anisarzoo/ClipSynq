// ClipSynq Service Worker
// Enables offline support and background sync

const CACHE_NAME = 'ClipSynq-v1';
const RUNTIME_CACHE = 'ClipSynq-runtime-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './manifest.json',
  './styles/base.css',
  './styles/app.css',
  './styles/components.css',
  './styles/login.css',
  './styles/mobile.css',
  './js/firebase-config.js',
  './js/app.js',
  './js/auth.js',
  './js/auth-check.js',
  './js/messages.js',
  './js/folders.js',
  './js/devices.js',
  './js/search.js',
  './js/qr.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new URL(url, self.location).href).filter(url => {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        })).catch(() => {
          console.log('[SW] Some static assets could not be cached (expected for CDN resources)');
        });
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and external APIs
  if (url.origin !== self.location.origin) {
    // For external APIs, use network only
    if (request.method === 'GET') {
      event.respondWith(fetch(request).catch(() => {
        return new Response('Offline - External resource unavailable', { status: 503 });
      }));
    }
    return;
  }

  // For HTML, CSS, JS - try cache first, then network
  if (request.method === 'GET') {
    // Cache first for static assets
    if (request.destination === 'style' || request.destination === 'script') {
      event.respondWith(
        caches.match(request).then(response => {
          return response || fetch(request).then(res => {
            // Don't cache responses from network for every fetch
            return res;
          }).catch(() => {
            return new Response('Offline', { status: 503 });
          });
        })
      );
      return;
    }

    // Network first for HTML
    if (request.destination === 'document') {
      event.respondWith(
        fetch(request).then(response => {
          // Update cache with fresh version
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          return caches.match(request).then(response => {
            return response || new Response('Offline - Page not cached', { status: 503 });
          });
        })
      );
      return;
    }
  }

  // Default: fetch from network
  event.respondWith(fetch(request));
});

// Background sync for messages (if internet connection is restored)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      fetch('./api/sync-messages', { method: 'POST' })
        .catch(() => {
          console.log('[SW] Background sync failed - will retry');
          // Retry sync when connection is restored
          return self.registration.sync.register('sync-messages');
        })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  }
});

// Periodic background sync (for modern browsers)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-messages') {
    event.waitUntil(
      // This would sync messages in the background
      Promise.resolve()
    );
  }
});

console.log('[SW] Service Worker initialized');

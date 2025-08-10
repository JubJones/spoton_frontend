// public/sw.js - Service Worker for SpotOn PWA
const CACHE_NAME = 'spoton-v1.0.0';
const RUNTIME_CACHE = 'spoton-runtime-v1.0.0';

// Resources to cache immediately
const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/index.css',
  '/static/js/index.js',
  // Add other essential assets
];

// Runtime caching patterns
const RUNTIME_CACHE_PATTERNS = [
  {
    pattern: /\.(?:js|css)$/,
    strategy: 'StaleWhileRevalidate',
    maxEntries: 50,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  {
    pattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    strategy: 'CacheFirst',
    maxEntries: 100,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  {
    pattern: /^https:\/\/api\./,
    strategy: 'NetworkFirst',
    maxEntries: 50,
    maxAge: 5 * 60, // 5 minutes
  },
];

// Install event - precache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing');

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Precaching resources');
        return cache.addAll(PRECACHE_RESOURCES);
      })
      .then(() => {
        console.log('Service Worker: Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip WebSocket and streaming requests
  if (event.request.headers.get('upgrade') === 'websocket') {
    return;
  }

  // Skip requests with cache-control: no-cache
  if (event.request.headers.get('cache-control') === 'no-cache') {
    return;
  }

  const url = new URL(event.request.url);

  // Handle same-origin requests
  if (url.origin === location.origin) {
    event.respondWith(handleSameOriginRequest(event.request));
    return;
  }

  // Handle cross-origin requests
  event.respondWith(handleCrossOriginRequest(event.request));
});

// Handle same-origin requests
async function handleSameOriginRequest(request) {
  const url = new URL(request.url);

  // For navigation requests, try cache first, then network
  if (request.mode === 'navigate') {
    try {
      const networkResponse = await fetch(request);
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    } catch (error) {
      console.log('Service Worker: Network failed, trying cache');
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      // Return offline fallback page
      return caches.match('/offline.html') || new Response('Offline');
    }
  }

  // For API requests, try network first
  if (url.pathname.startsWith('/api/')) {
    return networkFirst(request);
  }

  // For assets, try cache first
  return cacheFirst(request);
}

// Handle cross-origin requests
async function handleCrossOriginRequest(request) {
  const url = new URL(request.url);

  // Apply runtime caching patterns
  for (const pattern of RUNTIME_CACHE_PATTERNS) {
    if (pattern.pattern.test(url.pathname) || pattern.pattern.test(url.href)) {
      switch (pattern.strategy) {
        case 'CacheFirst':
          return cacheFirst(request, pattern);
        case 'NetworkFirst':
          return networkFirst(request, pattern);
        case 'StaleWhileRevalidate':
          return staleWhileRevalidate(request, pattern);
      }
    }
  }

  // Default to network-only for unknown cross-origin requests
  return fetch(request);
}

// Caching strategies
async function cacheFirst(request, options = {}) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Cache first - network failed:', error);
    throw error;
  }
}

async function networkFirst(request, options = {}) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network first - trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, options = {}) {
  const cachedResponse = await caches.match(request);

  const networkResponsePromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(RUNTIME_CACHE);
        cache.then((c) => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('Service Worker: Stale while revalidate - network failed:', error);
      return null;
    });

  return cachedResponse || networkResponsePromise;
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  console.log('Service Worker: Performing background sync');

  // Example: sync offline actions, retry failed requests, etc.
  try {
    // Get offline actions from IndexedDB
    // Retry failed requests
    // Update cached data
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');

  if (!event.data) {
    return;
  }

  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2',
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icons/checkmark.png',
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification('SpotOn Alert', options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(clients.openWindow('/'));
  } else if (event.action === 'close') {
    event.notification.close();
  } else {
    event.waitUntil(clients.openWindow('/'));
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      })
    );
  }
});

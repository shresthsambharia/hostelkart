const CACHE_NAME = 'hostelkart-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo192.png',
  '/logo512.png',
  '/robots.txt',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Performance optimized caching strategies
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Ignore API requests, socket.io connections, and Sentry reports
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/socket.io') ||
    url.hostname.includes('sentry')
  ) {
    return;
  }

  // 2. Main HTML document & root navigation: Network-First (with offline cache fallback)
  const isHtml = event.request.headers.get('accept')?.includes('text/html') || 
                 url.pathname === '/' || 
                 url.pathname === '/index.html';

  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match('/') || caches.match('/index.html') || caches.match(event.request);
        })
    );
    return;
  }

  // 3. Hashed assets (Vite CSS/JS files): Cache-First (Immutable)
  const isHashedAsset = url.pathname.includes('/assets/') && 
                        (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'));

  if (isHashedAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 4. Other assets (Images, Fonts): Stale-While-Revalidate
  const isAllowedExternal = 
    url.hostname.includes('unpkg.com') || 
    url.hostname.includes('fonts.googleapis.com') || 
    url.hostname.includes('fonts.gstatic.com') || 
    url.hostname.includes('res.cloudinary.com') || 
    url.hostname.includes('images.unsplash.com') ||
    url.pathname.includes('/_vercel/image');

  const isLocalAsset = url.origin === self.location.origin;

  if (isLocalAsset || isAllowedExternal) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

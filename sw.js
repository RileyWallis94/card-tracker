const CACHE_NAME = 'cardfmv-shell-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// 1. Install: Cache the app shell & external CDN scripts while online
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          fetch(url, { mode: 'cors' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => cache.add(url))
        )
      );
    })
  );
});

// 2. Activate: Clean up old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// 3. Fetch: Network-first for HTML & scripts, automatic fallback to Cache when offline
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Let Supabase API calls go straight to network so index.html's catch block handles offline data
  if (req.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        // Update cache with latest version whenever online
        const resClone = networkRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return networkRes;
      })
      .catch(() => {
        // When offline, serve the saved file from cache
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          if (req.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
      })
  );
});

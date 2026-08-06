// CFA Buddy Service Worker - Offline-First Caching Strategy
const CACHE_VERSION = 'v2';
const STATIC_CACHE = 'cfa-buddy-static-' + CACHE_VERSION;
const DYNAMIC_CACHE = 'cfa-buddy-dynamic-' + CACHE_VERSION;
const DATA_CACHE = 'cfa-buddy-data-' + CACHE_VERSION;

// App shell resources to pre-cache on install
const APP_SHELL = [
  '/',
  '/dashboard',
  '/questions',
  '/flashcards',
  '/formulas',
  '/learn',
  '/mistakes',
  '/exam-plan',
];

// Static asset patterns to cache
const STATIC_EXTENSIONS = ['.js', '.css', '.woff2', '.woff', '.ttf', '.png', '.jpg', '.jpeg', '.svg', '.ico'];

// Install event - pre-cache app shell
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function (event) {
  var validCaches = [STATIC_CACHE, DYNAMIC_CACHE, DATA_CACHE];
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return validCaches.indexOf(key) === -1;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - routing strategy
self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API routes: network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, DATA_CACHE));
    return;
  }

  // Static assets: cache first, network fallback
  var isStaticAsset = STATIC_EXTENSIONS.some(function (ext) {
    return url.pathname.endsWith(ext);
  });

  if (isStaticAsset || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // HTML pages: network first, cache fallback (app shell)
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
    return;
  }

  // Default: network first
  event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
});

// Cache-first strategy for static assets
function cacheFirstStrategy(request, cacheName) {
  return caches.match(request).then(function (cached) {
    if (cached) {
      return cached;
    }
    return fetch(request).then(function (response) {
      if (response && response.status === 200) {
        var responseClone = response.clone();
        caches.open(cacheName).then(function (cache) {
          cache.put(request, responseClone);
        });
      }
      return response;
    });
  });
}

// Network-first strategy for dynamic content
function networkFirstStrategy(request, cacheName) {
  return fetch(request)
    .then(function (response) {
      if (response && response.status === 200) {
        var responseClone = response.clone();
        caches.open(cacheName).then(function (cache) {
          cache.put(request, responseClone);
        });
      }
      return response;
    })
    .catch(function () {
      return caches.match(request).then(function (cached) {
        if (cached) {
          return cached;
        }
        // Return offline fallback for navigation requests
        if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
          return caches.match('/');
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    });
}

// Listen for messages from the app
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'CACHE_QUESTION_DATA') {
    var data = event.data.payload;
    caches.open(DATA_CACHE).then(function (cache) {
      var response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
      cache.put('/offline-data/questions', response);
    });
  }

  if (event.data && event.data.type === 'CACHE_FLASHCARD_DATA') {
    var data = event.data.payload;
    caches.open(DATA_CACHE).then(function (cache) {
      var response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
      cache.put('/offline-data/flashcards', response);
    });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

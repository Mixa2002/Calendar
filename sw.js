/**
 * sw.js  —  Service Worker for Calendar PWA
 *
 * Strategy:
 *   - Static assets  → Cache-first  (shell files, JS, CSS, icons, manifest)
 *   - Supabase calls → Network-first, fall through to cache if offline,
 *                      never block the UI on a network error
 *   - Google Fonts   → Stale-while-revalidate (nice-to-have, not critical)
 *
 * Cache versioning: bump CACHE_VERSION when deploying changes to static files.
 * The activate handler deletes all caches whose name doesn't match.
 */

const CACHE_VERSION = 'v3';
const STATIC_CACHE  = `calendar-static-${CACHE_VERSION}`;
const FONT_CACHE    = `calendar-fonts-${CACHE_VERSION}`;

// Everything that must be available offline on first install.
// Paths are relative to the service worker scope (site root).
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/calendar.js',
  '/js/dashboard.js',
  '/js/modal.js',
  '/js/store.js',
  '/js/supabase.js',
  '/js/utils.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-180.png',
];

// ── helpers ───────────────────────────────────────────────────────────────────

function isSupabaseRequest(url) {
  return url.hostname.endsWith('.supabase.co');
}

function isGoogleFont(url) {
  return url.hostname === 'fonts.googleapis.com' ||
         url.hostname === 'fonts.gstatic.com';
}

function isStaticAsset(url) {
  // Same-origin requests for our own files
  return url.origin === self.location.origin;
}

// ── install ───────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // addAll fetches and caches everything; if any request fails the whole
      // install fails — that is intentional so we don't ship a broken shell.
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      // Skip the waiting phase so the new SW activates immediately on first
      // install (rather than waiting for all tabs to close).
      return self.skipWaiting();
    })
  );
});

// ── activate ──────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const allowedCaches = [STATIC_CACHE, FONT_CACHE];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !allowedCaches.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Immediately take control of all open clients without requiring a reload.
      return self.clients.claim();
    })
  );
});

// ── fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests — POST/PUT/DELETE go straight to network.
  if (event.request.method !== 'GET') return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return; // malformed URL — leave it alone
  }

  // ── 1. Supabase API — network-first, no caching ──────────────────────────
  if (isSupabaseRequest(url)) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return a minimal JSON error so the app can handle it gracefully
        // rather than showing a browser network-error page.
        return new Response(
          JSON.stringify({ error: { message: 'You are offline. Please reconnect.' } }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // ── 2. Google Fonts — stale-while-revalidate ─────────────────────────────
  if (isGoogleFont(url)) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached); // offline: serve whatever we have

          // Return cached immediately if available; otherwise wait for network.
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // ── 3. CDN scripts (Supabase JS bundle from jsdelivr) — network-first ────
  //    We don't cache third-party CDN scripts to avoid serving stale bundles,
  //    but we do fall back to cache if the CDN is unreachable.
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) => {
        return fetch(event.request).then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => cache.match(event.request));
      })
    );
    return;
  }

  // ── 4. Our own static assets — cache-first ───────────────────────────────
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        // Not in cache yet (e.g. a path added after install).
        // Fetch, cache, and return.
        return fetch(event.request).then((response) => {
          if (!response.ok) return response;
          return caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        }).catch(() => {
          // Completely offline and not cached — return the shell HTML for
          // navigation requests so the app can display its own offline UI.
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // All other requests fall through to the browser's default handling.
});

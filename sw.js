/**
 * LifeQuest Offline Service Worker
 * Pre-caches the app shell so LifeQuest launches and runs 100% offline on PC & Phone.
 * Never caches or intercepts cross-origin API calls (such as api.github.com Gist Sync).
 */

const BUILD_VERSION = '__BUILD_HASH__';
const CACHE_NAME = `lifequest-${BUILD_VERSION}`;

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './icon.svg',
  './manifest.webmanifest',
  './src/app.js',
  './src/charts.js',
  './src/confetti.js',
  './src/fx.js',
  './src/rpgEngine.js',
  './src/sound.js',
  './src/storage.js',
  './src/sync.js',
  './src/ui.js',
  './src/views/dashboard.js',
  './src/views/helpers.js',
  './src/views/modals.js',
  './src/views/quests.js',
  './src/views/shop.js',
  './src/views/stats.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('lifequest-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept cross-origin requests (e.g., api.github.com for Gist Sync)
  if (url.origin !== self.location.origin) return;

  const isImmutableVersioned =
    BUILD_VERSION !== '__BUILD_HASH__' && url.searchParams.get('v') === BUILD_VERSION;

  // Version-pinned assets from hashed builds are immutable: serve from cache immediately
  if (isImmutableVersioned) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML navigations and unversioned assets: network-first with offline cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return (await caches.match('./index.html')) || (await caches.match('./'));
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});

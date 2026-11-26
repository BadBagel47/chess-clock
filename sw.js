// Service worker: makes the clock work offline (F-010).
// Network first, so a new version is picked up without manual cache bumps;
// the cache is used when offline or when the network is too slow.

const CACHE = 'chess-clock';
const TIMEOUT_MS = 2500;

// Keep in sync with the app's files (checked by tests/sw.test.mjs).
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/clock.js',
  'js/feedback.js',
  'js/presets.js',
  'js/storage.js',
  'js/themes.js',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((a) => new Request(a, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fromNetwork(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        const cached =
          (await cache.match(request, { ignoreSearch: true })) ||
          (request.mode === 'navigate' ? await cache.match('index.html') : undefined);
        return cached || Response.error();
      }
    })(),
  );
});

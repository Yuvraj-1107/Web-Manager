const CACHE_VERSION = 'v2';
const CACHE = 'kiet-web-manager-' + CACHE_VERSION;

// Files that live next to index.html
const LOCAL = [
  './',
  'index.html',
  'style.css',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'Screenshot 2026-09-19 180657.png',
  'Screenshot 2026-09-19 001601.png',
  'Screenshot 2026-09-23 210940.png'
];

async function saveOne(cache, request) {
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === 'opaque')) await cache.put(request, res);
  } catch (err) {
    // ignore: this one file is skipped, the rest still get saved
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(LOCAL.map((url) => saveOne(cache, new Request(url))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('kiet-web-manager-') && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // Page loads: network first, saved page when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Everything else: saved copy first, refresh in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const refresh = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});
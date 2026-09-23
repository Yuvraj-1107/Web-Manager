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

// Outside images and fonts used by the page (saved as "opaque" copies)
const EXTERNAL = [
  'https://cdn.kiet.co.in/users/06982ee3-c1a2-7297-8000-1d507f8b3bab/ORGANIZATION_MEDIA/0698432f-01f7-7413-8000-b7693899885c',
  'https://s3.ap-south-1.amazonaws.com/ct-client-logos/logos/kiet',
  'https://corporate.bharatenglish.org/assets/images/bet-app/BET_logo.png',
  'https://play-lh.googleusercontent.com/SeFFN3si2bQ9jFK2oZbEKkS5aYwJyrgNaQjZvUub44KGlby2RXofnDbZkdSiU_7jtyDc4Ctd5sCdTs8R6Klf7w',
  'https://www.kiet.edu/_next/image/?url=%2Fassets%2Fimages%2Fkiet%2Fmain%2Fnew%2FWEB%20Banner.webp&w=3840&q=75&dpl=dpl_Aa5kQpUMDyFfkcsJM5u7K7e145SH',
  'https://media.istockphoto.com/id/480975194/photo/sunrise-and-dramatic-clouds-over-lavender-field.jpg?s=612x612&w=0&k=20&c=9oOUcyMJrutCRxdOp0HYUz0avbuT4akmwKvL-aa_QkI=',
  'https://fonts.googleapis.com/css2?family=Krona+One&family=Syne:wght@700;800&family=Space+Grotesk:wght@400;500;600;700&family=Playfair+Display:ital,wght@1,600;1,700&display=swap'
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
      Promise.all([
        ...LOCAL.map((url) => saveOne(cache, new Request(url))),
        ...EXTERNAL.map((url) => saveOne(cache, new Request(url, { mode: 'no-cors' })))
      ])
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
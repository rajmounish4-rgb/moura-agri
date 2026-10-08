/* MouRa service worker.
   - The app shell (HTML) is NETWORK-FIRST so a new version arrives as soon as you are online,
     and falls back to cache when offline.
   - Other same-origin assets (icons, manifest, notes PDFs) are CACHE-FIRST for speed.
   - AI / live-API hosts are never cached and simply need a network. */
const CACHE = 'moura-v80';
const SHELL = [
  './',
  './index.html',
  './data.json',
  './reels.json',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(
    SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null))
  )));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const NEVER = /script\.google|pollinations|generativelanguage|googleapis|openai\.com|groq\.com|anthropic|openweathermap|open-meteo/i;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (NEVER.test(u.hostname + u.pathname)) return;
  if (u.origin !== self.location.origin) return;

  const isDoc = req.mode === 'navigate' || req.destination === 'document' ||
                /\.html?$/i.test(u.pathname) || /\.json$/i.test(u.pathname) || u.pathname.endsWith('/');

  if (isDoc) {
    // network-first: always try for the newest app, fall back to cache offline
    e.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.ok) {
          const cp = resp.clone();
          caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {});
        }
        return resp;
      }).catch(() => caches.match(req).then(h => h || caches.match('./index.html')))
    );
    return;
  }

  // cache-first for everything else
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(resp => {
        if (resp && resp.ok) {
          const cp = resp.clone();
          caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {});
        }
        return resp;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

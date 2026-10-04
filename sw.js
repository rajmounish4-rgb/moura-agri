/* MouRa service worker - caches the app shell so it loads with no internet.
   AI/API calls are never cached; they simply need a network. */
const CACHE = 'moura-v56';
const SHELL = [
  './',
  './index.html',
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

const NEVER = /script\.google|pollinations|generativelanguage|googleapis|openai\.com|groq\.com|anthropic|api\.openweathermap|open-meteo/i;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (NEVER.test(u.hostname + u.pathname)) return;          // AI + live APIs: always network
  if (u.origin !== self.location.origin) return;            // only cache our own files

  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(resp => {
        if (resp && resp.ok) {
          const cp = resp.clone();
          caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {});
        }
        return resp;
      }).catch(() => hit || caches.match('./index.html'));
      return hit || net;                                     // cache-first, then network
    })
  );
});

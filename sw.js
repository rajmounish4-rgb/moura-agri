/* MouRa service worker - minimal. The app is self-contained, so there is nothing else to cache. */
const CACHE = 'moura-v83';
const SHELL = ['./', './index.html'];

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

  // the app itself: always try the network first, fall back to the cache offline
  e.respondWith(
    fetch(req).then(resp => {
      if (resp && resp.ok) {
        const cp = resp.clone();
        caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {});
      }
      return resp;
    }).catch(() => caches.match(req).then(h => h || caches.match('./index.html')))
  );
});

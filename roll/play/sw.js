const V = 'vmwm9m0vy';
const CORE = ['./', './app.js', './naidan.glb'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(V)
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function navFirst(req, cache) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(req, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res && res.ok) cache.put('./', res.clone());
    return res;
  } catch (err) {
    clearTimeout(timer);
    const hit = await cache.match('./');
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cache) {
  const hit = await cache.match(req);
  if (hit) {
    fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); }).catch(() => {});
    return hit;
  }
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const cdn = url.hostname === 'cdn.jsdelivr.net';
  if (!same && !cdn) return;

  if (req.mode === 'navigate') {
    e.respondWith(caches.open(V).then((c) => navFirst(req, c)));
    return;
  }
  if (same || cdn) {
    e.respondWith(caches.open(V).then((c) => cacheFirst(req, c).catch(() => caches.match(req))));
  }
});

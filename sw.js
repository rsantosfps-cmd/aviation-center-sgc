const CACHE = "aviation-center-calibracoes-v2.5-print-selector";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./pdf.js",
  "./backend-config.js",
  "./backend.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isAppShellRequest(req) {
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return false;
  return APP_SHELL.some(path => url.pathname.endsWith(path.replace("./", "/"))) ||
         url.pathname === "/";
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  // App shell: online-first. This prevents an old cached JavaScript version
  // from staying active after a new deployment, while still working offline.
  if (isAppShellRequest(req)) {
    event.respondWith(
      fetch(req)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  // Other GET requests: cache-first with network fallback.
  event.respondWith(
    caches.match(req)
      .then(cached => cached || fetch(req).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return response;
      }))
      .catch(() => caches.match("./index.html"))
  );
});

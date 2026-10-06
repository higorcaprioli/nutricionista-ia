// Cache do app para abrir offline. Chamadas à API nunca são cacheadas.
const CACHE = "nutri-v1";
const ASSETS = [
  "./", "./index.html", "./styles.css", "./manifest.webmanifest",
  "./js/app.js", "./js/store.js", "./js/calc.js", "./js/data.js", "./js/ai.js",
  "./icons/icon-192.png", "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Rede primeiro (pega atualizações), cache como reserva offline.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.hostname === "api.anthropic.com") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && (url.origin === location.origin || url.hostname === "cdn.jsdelivr.net")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});

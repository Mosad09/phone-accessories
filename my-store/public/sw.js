const CACHE_NAME = "veltrix-pwa-v1";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/manifest-admin.webmanifest",
  "/favicon.svg",
  "/favicon-admin.svg",
  "/icons/store-192.png",
  "/icons/store-512.png",
  "/icons/admin-192.png",
  "/icons/admin-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network first so fresh builds & separate /admin/ HTML always win
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        url.pathname.startsWith("/admin")
          ? caches.match("/admin/index.html")
          : caches.match("/index.html")
      )
    );
    return;
  }

  // Static built assets: cache first with background fallback
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return res;
          })
      )
    );
  }
});

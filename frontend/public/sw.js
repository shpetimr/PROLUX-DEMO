const CACHE_PREFIX = "prolux-pwa";
const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}-runtime`;

const APP_SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/prolux-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-icon-512.png",
  "/icons/apple-touch-icon.png",
];

const isSameOrigin = (url) => url.origin === self.location.origin;
const isApiRequest = (url) => isSameOrigin(url) && url.pathname.startsWith("/api/");
const isServiceWorkerRequest = (url) =>
  isSameOrigin(url) && url.pathname.endsWith("/sw.js");
const isNavigationRequest = (request) =>
  request.mode === "navigate" ||
  request.headers.get("accept")?.includes("text/html");
const isAppShellAsset = (url) =>
  isSameOrigin(url) &&
  (url.pathname.startsWith("/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/prolux-logo.png");

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) =>
        cache.addAll(
          APP_SHELL_URLS.map((url) => new Request(url, { cache: "reload" }))
        )
      )
      .catch(() => undefined)
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith(CACHE_PREFIX) &&
                cacheName !== APP_SHELL_CACHE &&
                cacheName !== RUNTIME_CACHE
            )
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (!isSameOrigin(url) || isApiRequest(url) || isServiceWorkerRequest(url)) {
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isAppShellAsset(url)) {
    event.respondWith(cacheFirstAsset(request));
  }
});

async function networkFirstNavigation(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse?.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.put("/index.html", networkResponse.clone());
    }

    return networkResponse;
  } catch {
    const cachedResponse =
      (await caches.match(request)) || (await caches.match("/index.html"));

    if (cachedResponse) {
      return cachedResponse;
    }

    throw new Error("PROLUX app shell is not available offline yet.");
  }
}

async function cacheFirstAsset(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);

  if (networkResponse?.ok && networkResponse.type === "basic") {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, networkResponse.clone());
  }

  return networkResponse;
}

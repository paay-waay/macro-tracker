const CACHE_NAME = "macro-tracker-v16-shell-2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  if (isAppShellRequest(url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

function isAppShellRequest(url) {
  const relativePath = getRelativePathInScope(url);
  return APP_SHELL.includes(relativePath);
}

function getRelativePathInScope(url) {
  const scopeUrl = new URL(self.registration.scope);
  const scopePath = scopeUrl.pathname.endsWith("/") ? scopeUrl.pathname : `${scopeUrl.pathname}/`;
  let path = url.pathname;

  if (path === scopePath) {
    return "./";
  }

  if (path.startsWith(scopePath)) {
    path = path.slice(scopePath.length);
  } else {
    path = path.replace(/^\//, "");
  }

  return path ? `./${path}` : "./";
}

async function handleNavigationRequest(event) {
  const preload = await event.preloadResponse;
  if (preload) {
    return preload;
  }

  try {
    const networkResponse = await fetch(event.request, { cache: "no-store" });
    const cache = await caches.open(CACHE_NAME);
    cache.put("./index.html", networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cached = await caches.match("./index.html");
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: "no-store" });
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

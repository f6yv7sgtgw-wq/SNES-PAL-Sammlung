/* SNES Collect Service Worker — network-first, Cache-Fallback nur offline. */
const CACHE = "snes-collect-1.0.0";

const cleanUrl = (value) => {
  const url = new URL(value);
  url.search = "";
  url.hash = "";
  return url.href;
};

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const key = cleanUrl(request.url);
      try {
        const response = await fetch(request);
        if (response.ok && (response.type === "basic" || response.type === "default")) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(key, copy)).catch(() => {});
        }
        return response;
      } catch (error) {
        const cached = await caches.match(key);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match(cleanUrl(new URL("./", self.location.href).href));
          if (shell) return shell;
        }
        throw error;
      }
    })(),
  );
});

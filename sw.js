/*
 * Avellvis - Service Worker
 * Optimiza la carga para usuarios recurrentes:
 *  - Precarga y almacena el shell de la app (HTML, CSS, JS del mismo origen).
 *  - Navegación (HTML): red primero, respaldo en caché (offline).
 *  - Estáticos: stale-while-revalidate (carga instantánea + actualización en segundo plano).
 *  - Imágenes: caché primero (con límite de entradas).
 *  - API de Google Sheets y WhatsApp no se interceptan.
 */

const CACHE_VERSION = "avellvis-v3";
const STATIC_CACHE = CACHE_VERSION + "-static";
const IMG_CACHE = CACHE_VERSION + "-img";
const MAX_IMG_ENTRIES = 120;

const PRECACHE = [
  "/",
  "/index.html",
  "/css/base.css?v=5",
  "/css/store.css?v=5",
  "/js/config.js?v=5",
  "/js/api.js?v=5",
  "/js/store.js?v=5",
  "/js/pwa.js?v=5",
];

const IMG_RE = /\.(png|jpe?g|gif|webp|avif|svg|bmp|ico)(\?|$)/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch(() => {
            /* un recurso que falle no debe romper la instalación */
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function trimCache(cache, max) {
  cache.keys().then((keys) => {
    if (keys.length <= max) return;
    for (let i = 0; i < keys.length - max; i++) cache.delete(keys[i]);
  });
}

function esHttp(res) {
  return res && (res.ok || res.type === "opaque");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  /* API de Google / WhatsApp: dejar pasar sin interceptar. */
  if (
    url.hostname.endsWith("script.google.com") ||
    url.hostname.endsWith("googleusercontent.com") ||
    url.hostname.endsWith("wa.me")
  ) {
    return;
  }

  /* Navegación HTML: red primero, respaldo en caché. */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("/index.html")),
        ),
    );
    return;
  }

  /* Imágenes (propias o externas): caché primero. */
  if (req.destination === "image" || IMG_RE.test(url.pathname)) {
    event.respondWith(
      caches.open(IMG_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          if (hit) return hit;
          return fetch(req)
            .then((res) => {
              if (esHttp(res)) {
                cache.put(req, res.clone());
                trimCache(cache, MAX_IMG_ENTRIES);
              }
              return res;
            })
            .catch(() => hit);
        }),
      ),
    );
    return;
  }

  /* Estáticos del mismo origen: stale-while-revalidate. */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          const red = fetch(req)
            .then((res) => {
              if (res && res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(() => hit);
          return hit || red;
        }),
      ),
    );
  }
});

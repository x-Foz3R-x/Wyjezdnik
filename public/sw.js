/// <reference lib="webworker" />

// Zmień wersję przy każdej zmianie publicznego szkieletu PWA.
const CACHE_NAME = "wyjezdnik-shell-v5";
const SHELL_PAGES = ["/", "/offline"];
const STATIC_FILES = [
  "/manifest.webmanifest",
  "/favicon.png",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-maskable.svg",
];

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (globalThis));

sw.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await Promise.allSettled([
        ...STATIC_FILES.map((url) => cache.add(new Request(url, { cache: "reload" }))),
        ...SHELL_PAGES.map((url) => cacheShellPage(cache, url)),
      ]);
    })(),
  );
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      );
      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void sw.skipWaiting();
  }
});

sw.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== sw.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

/** @param {Request} request */
async function networkNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match("/offline")) || Response.error();
  }
}

/** @param {Request} request */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

/** @param {URL} url */
function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || STATIC_FILES.includes(url.pathname);
}

/**
 * @param {Cache} cache
 * @param {string} url
 */
async function cacheShellPage(cache, url) {
  try {
    const response = await fetch(new Request(url, { cache: "reload" }));
    if (!response.ok) return;

    await cache.put(url, response.clone());
    const html = await response.text();
    const assetUrls = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)]
      .map((match) => match[1] ?? "")
      .filter((assetUrl) => assetUrl?.startsWith("/_next/static/"));

    await Promise.allSettled(
      [...new Set(assetUrls)].map((assetUrl) =>
        cache.add(new Request(assetUrl, { cache: "reload" })),
      ),
    );
  } catch {
    // Instalacja PWA nie powinna się wywrócić przez pojedynczy brakujący asset.
  }
}

/* VOLT FORGE service worker v1 */
const CACHE = "volt-forge-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isAppShell(req) {
  if (req.mode === "navigate") return true;
  const url = new URL(req.url);
  return url.origin === location.origin && /(\/|index\.html)$/.test(url.pathname);
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // アプリ本体＝ネット優先（更新がすぐ届く）。オフライン時だけキャッシュ。
  if (isAppShell(e.request)) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request).then((h) => h || caches.match("./index.html")))
    );
    return;
  }

  // その他（three.js CDN・HDRI・テクスチャ）＝キャッシュ優先＋初回に貯める
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      });
    })
  );
});

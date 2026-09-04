// 织见 Service Worker — 离线缓存
const CACHE_NAME = "zhijian-v1";
const ASSETS = [
  "../../织见-思维关系板-C6.html",
  "../../c6/styles.css",
  "../../c6/js/config.js",
  "../../c6/js/state.js",
  "../../c6/js/render.js",
  "../../c6/js/editors.js",
  "../../c6/js/layout.js",
  "../../c6/js/interaction.js",
  "../../c6/js/preview.js",
  "../../c6/js/tutorial.js",
  "../../c6/js/ai.js",
  "../../c6/js/app.js",
  "../../织见-品牌图标-v2.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request);
    })
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

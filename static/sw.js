// CineVocab service worker: statik varlıkları önbellekler, ağ yoksa çevrimdışı yedek gösterir.
// Statik dosyalar önce AĞDAN istenir (sunucu ETag ile 304 döner, ucuzdur); önbellek yalnızca ağ yokken kullanılır.
// Eskiden önce önbellek verilip arkada yenileniyordu: yeni sayfa eski i18n.js ile açılıp çeviri anahtarları ham görünüyordu.
const V = "cv-v2";
const CORE = ["/static/app.css", "/static/common.js", "/static/i18n.js", "/static/icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.startsWith("/static/")) {
    e.respondWith(caches.open(V).then(c =>
      fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; })
        .catch(() => c.match(r, {ignoreSearch: true}).then(hit => hit || Response.error()))
    ));
  }
});

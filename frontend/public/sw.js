// VoxResearch offline shell: cache-first app shell + assets (versioned),
// network-only for /api. Saved chats (localStorage) stay readable offline.
const V = "vox-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (u.pathname.startsWith("/api/")) return;
  e.respondWith(
    caches.open(V).then(async (cache) => {
      const hit = await cache.match(e.request);
      const net = fetch(e.request)
        .then((r) => {
          if (r && r.ok) cache.put(e.request, r.clone());
          return r;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});

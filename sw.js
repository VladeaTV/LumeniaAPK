/* LUMENIA — service worker : jeu jouable hors ligne, mises à jour automatiques */
const CACHE = "lumenia-app-v3";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png?v=2", "./icon-512.png?v=2", "./apple-touch-icon.png?v=2", "./favicon-32.png?v=2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Le jeu lui-même : toujours la dernière version en ligne, la copie en cache si hors ligne
  if (req.mode === "navigate" || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    if (req.cache === "no-store") return;            // vérification de version : directement le réseau
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)); return r; })
      .catch(() => caches.match("./index.html").then(r => r || caches.match("./"))));
    return;
  }
  // Le reste (icônes, Tailwind, polices) : cache d'abord, rafraîchi en arrière-plan
  if (url.origin === location.origin || /cdn\.tailwindcss\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
  // Tout le reste (multijoueur en ligne, etc.) passe normalement par le réseau
});

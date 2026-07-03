const CACHE_NAME = 'mercado-ws-v19-texture-direct';
const ASSETS = [
  '/', '/index.html',
  '/css/style.css', '/css/animations.css',
  '/js/api.js', '/js/app.js',
  '/js/components/utils.js', '/js/components/toast.js', '/js/components/modal.js', '/js/components/panel.js',
  '/js/views/home.js', '/js/views/categories.js', '/js/views/items.js', '/js/views/admin.js', '/js/views/seller.js',
  '/images/favorito.png', '/images/cantoneira.png', '/images/fundo.png', '/images/wsdb_slot_frame.png',
  '/images/uploads/gold_coin.png', '/images/uploads/mercado.png', '/images/uploads/administrativo.png',
  '/database/categories.tree.json', '/database/items.static.json', '/database/settings.public.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});

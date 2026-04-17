const CACHE = 'oursmusic-v2';
const STATIC = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') {
    // Para métodos não-GET, deixa passar normalmente
    return;
  }

  const url = new URL(e.request.url);

  // Nunca intercepta API, backend ou recursos externos
  if (
    e.request.url.includes('/api/') ||
    e.request.url.includes(':3000') ||
    url.pathname.match(/\.(mp3|mp4|ogg|wav|flac|aac|m4a|webm|opus)$/) ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('amazonaws.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('googleusercontent.com') ||
    url.hostname !== self.location.hostname
  ) {
    // Deixa passar sem interceptar
    return;
  }

  // index.html: sempre busca da rede, fallback para cache só se offline
  if (url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match('/index.html').then(cached => cached || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // JS/CSS chunks: cache-first (nomes são hashed, nunca mudam)
  if (url.pathname.match(/\.(js|css|woff2?|ttf|ico|png|svg|webp)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => new Response('Not cached', { status: 503 }));
      })
    );
    return;
  }

  // Demais requests: network-first
  e.respondWith(
    fetch(e.request).catch(() => 
      caches.match(e.request).then(cached => cached || new Response('Offline', { status: 503 }))
    )
  );
});

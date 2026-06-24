const CACHE_NAME = 'sindidoc-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  '/globals.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Excluir llamadas de API de base de datos/autenticación para no interferir con Supabase/REST APIs dinámicas
  // Pero sí permitimos el proxy de PDF para que carguen los PDFs offline si ya los vio una vez
  if (
    url.pathname.includes('/api/') && 
    !url.pathname.includes('/api/pdf-proxy') &&
    !url.pathname.includes('/api/scopes') &&
    !url.pathname.includes('/api/sectors')
  ) {
    return;
  }

  // Ignorar consultas directas a Supabase (supabase.co) para manejarlas por localStorage
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si está en caché, devolverlo y actualizar en background (Stale While Revalidate)
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Silenciar fallos de red mientras estamos offline
          });
        return cachedResponse;
      }

      // Si no está en caché, intentar obtener de la red y cachear
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !url.pathname.includes('/api/pdf-proxy')) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Retornar fallback para imágenes o recursos si es necesario
        });
    })
  );
});

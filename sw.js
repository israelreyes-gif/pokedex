/* ============================================================
   sw.js — Service Worker: guarda los archivos de la app (no los
   datos de Pokémon) para que la propia app cargue sin conexión.
   Estrategia: red primero, y si falla, se sirve desde caché.
   Cada vez que se abre con conexión, la caché se refresca sola.
   ============================================================ */

const CACHE_NAME = 'pokedex-shell-v6'; // sube el número si algún día quieres forzar limpieza de caché

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/storage.js',
  './js/data.js',
  './js/matchup-engine.js',
  './js/pokemon-view.js',
  './js/evolution-view.js',
  './js/moves-view.js',
  './js/search-autocomplete.js',
  './js/types-view.js',
  './js/team-view.js',
  './manifest.json',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.map(function(name){
        if(name !== CACHE_NAME) return caches.delete(name);
      }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  const req = event.request;

  // Solo gestionamos los archivos propios de la app (mismo origen).
  // Las peticiones a PokeAPI y a los sprites siguen su camino normal;
  // esos datos ya tienen su propia caché dentro de la app (localStorage).
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin){
    return;
  }

  event.respondWith(
    fetch(req).then(function(res){
      const resClone = res.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(cached){
        return cached || caches.match('./index.html');
      });
    })
  );
});

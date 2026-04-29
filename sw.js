const CACHE_NAME = 'reading-tracker-v1';
const CACHE_NAME = 'reading-tracker-v2';
const ASSETS = [
    './index.html',
    './css/style.css',
    './js/store.js',
    './js/covers.js',
    './js/csv.js',
    './js/views.js',
    './js/stats.js',
    './js/app.js',
    './manifest.json'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});

const CACHE_NAME = 'accessory-info-v1';
const FILES = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(found => found || fetch(event.request)));
});

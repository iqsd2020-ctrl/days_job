// sw.js (Service Worker)

const CACHE_NAME = 'aamal-al-ayam-cache-v2';

// [تصحيح] تم إزالة "/" من بداية المسارات لجعلها نسبية
const urlsToCache = [
  'index.html', // المسار الصحيح
  'manifest.json' // المسار الصحيح
];

// 1. حدث التثبيت (Install)
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('Service Worker: Failed to cache app shell', err);
      })
  );
});

// 2. حدث التفعيل (Activate)
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. حدث الجلب (Fetch)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      // 1. البحث في الكاش أولاً
      return cache.match(event.request)
        .then((cachedResponse) => {
          
          // 2. إذا لم يكن في الكاش، اذهب للشبكة
          const fetchPromise = fetch(event.Request.clone(event.request)) // Use cloned request
            .then((networkResponse) => {
              // 3. تخزين الاستجابة الجديدة في الكاش
              if (networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(err => {
              console.log('Service Worker: Fetch failed, no network or cache.', err);
            });

          // 4. إرجاع الاستجابة
          return cachedResponse || fetchPromise;
        });
    })
  );
});

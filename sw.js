// sw.js (Service Worker)

// تعريف اسم الكاش (Cache) والإصدار
// [ملاحظة] تغيير الاسم يجبر الـ Service Worker على التحديث
const CACHE_NAME = 'aamal-al-ayam-cache-v2';

// قائمة الملفات الأساسية التي سيتم تخزينها في الكاش
// هذه هي "قشرة التطبيق" (App Shell)
const urlsToCache = [
  'index.html', // المسار الجذر
  'manifest.json'
  // باقي الملفات (الخطوط، الصوتيات، CSS) سيتم تخزينها ديناميكياً عند أول طلب
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
        // تفعيل الـ Service Worker الجديد فوراً
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('Service Worker: Failed to cache app shell', err);
      })
  );
});

// 2. حدث التفعيل (Activate)
// يتم استخدامه لتنظيف الكاش القديم إذا تغير اسم CACHE_NAME
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
// [تصحيح] تطبيق استراتيجية "Cache-First, then Network & Cache"
// هذا سيجعل التطبيق يعمل أوفلاين بالكامل بعد الزيارة الأولى
self.addEventListener('fetch', (event) => {
  // لا نطبق الكاش على طلبات غير GET (مثل POST)
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      // 1. البحث في الكاش أولاً
      return cache.match(event.request)
        .then((cachedResponse) => {
          
          // 2. إذا لم يكن في الكاش، اذهب للشبكة
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              // 3. تخزين الاستجابة الجديدة في الكاش
              // نتأكد أن الاستجابة صالحة قبل تخزينها
              if (networkResponse.ok) {
                // نخزن نسخة (clone) لأن الاستجابة تستخدم مرة واحدة
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(err => {
              // في حال فشل الشبكة ولم يكن العنصر في الكاش (وضع الأوفلاين)
              console.log('Service Worker: Fetch failed, no network or cache.', err);
              // يمكنك إرجاع صفحة "أوفلاين" احتياطية هنا
            });

          // 4. إرجاع الاستجابة
          // إذا كانت في الكاش (cachedResponse)، أرجعها فوراً
          // إذا لم تكن، انتظر نتيجة الشبكة (fetchPromise)
          return cachedResponse || fetchPromise;
        });
    })
  );
});
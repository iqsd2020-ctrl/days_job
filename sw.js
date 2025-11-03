// sw.js (Service Worker)

// تعريف اسم الكاش (Cache) والإصدار
const CACHE_NAME = 'aamal-al-ayam-cache-v1';

// قائمة الملفات الأساسية التي سيتم تخزينها في الكاش
// هذه هي "قشرة التطبيق" (App Shell)
const urlsToCache = [
  '/index.html', // المسار الجذر
  '/manifest.json'
  // ملاحظة: الملفات الخارجية (مثل Tailwind, Google Fonts, Audio) 
  // لن يتم تخزينها مبدئيًا هنا لضمان بدء التشغيل السريع.
  // سيعمل التطبيق اوفلاين بالملفات التي تم تخزينها فقط.
];

// 1. حدث التثبيت (Install)
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  // انتظر حتى يتم فتح الكاش وإضافة الملفات الأساسية إليه
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
  
  // إزالة أي كاش قديم لا يتطابق مع الاسم الحالي
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
      // إخبار العميل (المتصفح) أن الـ Service Worker جاهز
      return self.clients.claim();
    })
  );
});

// 3. حدث الجلب (Fetch)
// يعترض هذا الحدث جميع طلبات الشبكة (fetch requests)
self.addEventListener('fetch', (event) => {
  // نحن نستخدم استراتيجية "Cache First, falling back to Network"
  // (الكاش أولاً، ثم الشبكة إذا فشل الكاش)
  // هذا يجعل التطبيق يعمل أوفلاين بسرعة
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // إذا كان الملف موجوداً في الكاش، قم بإرجاعه
        if (response) {
          // console.log('Service Worker: Returning from cache', event.request.url);
          return response;
        }

        // إذا لم يكن موجوداً، اذهب إلى الشبكة
        // console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // ملاحظة اختيارية: يمكنك تخزين الطلبات الجديدة في الكاش هنا إذا أردت
            // ولكن كن حذراً، لأن هذا قد يملأ الكاش بسرعة.
            
            // if (networkResponse.status === 200 && event.request.method === 'GET') {
            //   caches.open(CACHE_NAME).then(cache => {
            //     cache.put(event.request, networkResponse.clone());
            //   });
            // }

            return networkResponse;
          })
          .catch((err) => {
            // هذا يحدث عندما تفشل الشبكة ولا يوجد شيء في الكاش
            console.error('Service Worker: Fetch failed', err);
            // يمكنك إرجاع صفحة أوفلاين احتياطية هنا إذا أردت
          });
      })
  );
});
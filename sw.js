// Service Worker cho Smart Desk Mat PWA
// Mục đích: (1) cho phép "Add to Home Screen" hoạt động đúng chuẩn,
// (2) cache file chính để mở lại nhanh / có mạng yếu vẫn vào được giao diện.
// LƯU Ý: các tính năng cần Internet thật (QR Remote qua MQTT, nhạc YouTube) vẫn cần mạng khi dùng.

const CACHE_NAME = 'deskmat-v3-cache-1';
const CORE_ASSETS = [
  './smart_desk_mat_v3.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Chiến lược: network-first cho file HTML chính (luôn lấy bản mới nhất khi có mạng),
// fallback về cache khi mất mạng. Các request khác (CDN, MQTT, YouTube...) đi thẳng qua mạng, không can thiệp.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isCoreAsset = CORE_ASSETS.some((a) => req.url.endsWith(a.replace('./', '')));

  if (req.method !== 'GET' || url.origin !== self.location.origin || !isCoreAsset) {
    return; // để mạng tự xử lý (MQTT websocket, ảnh QR, YouTube, mqtt.js CDN...)
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});

/* Türkiye Gezi Atlası — servis çalışanı
   Strateji:
   - HTML (gezinme istekleri): önce ağ, çevrimdışıysa önbellek.
     Böylece yeni sürümler sürüm numarası beklemeden anında gelir.
   - Statik dosyalar (ikon, manifest): önce önbellek, yoksa ağ.
   - Google Fonts: önbellekten sun, arka planda tazele.
   Sürüm değişince eski önbellek temizlenir. */
const CACHE = 'gezi-atlasi-v2';
const KABUK = [
  '.',
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(KABUK))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((adlar) => Promise.all(adlar.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const istek = e.request;
  if (istek.method !== 'GET') return;

  const url = new URL(istek.url);

  // Google Fonts: önbellekten sun, arka planda tazele
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const onbellek = await c.match(istek);
        const ag = fetch(istek).then((yanit) => {
          if (yanit && yanit.status === 200) c.put(istek, yanit.clone());
          return yanit;
        }).catch(() => onbellek);
        return onbellek || ag;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // HTML gezinmeleri: ÖNCE AĞ — güncellemeler anında gelsin; çevrimdışıysa önbellek
  const htmlIstek = istek.mode === 'navigate' || url.pathname.endsWith('/index.html');
  if (htmlIstek) {
    e.respondWith(
      fetch(istek).then((yanit) => {
        if (yanit && yanit.status === 200) {
          const kopya = yanit.clone();
          caches.open(CACHE).then((c) => c.put(istek, kopya));
        }
        return yanit;
      }).catch(() =>
        caches.match(istek).then((r) => r || caches.match('index.html'))
      )
    );
    return;
  }

  // Statik dosyalar: önce önbellek, sonra ağ
  e.respondWith(
    caches.match(istek).then((onbellek) => {
      if (onbellek) return onbellek;
      return fetch(istek).then((yanit) => {
        if (yanit && yanit.status === 200 && yanit.type === 'basic') {
          const kopya = yanit.clone();
          caches.open(CACHE).then((c) => c.put(istek, kopya));
        }
        return yanit;
      });
    })
  );
});

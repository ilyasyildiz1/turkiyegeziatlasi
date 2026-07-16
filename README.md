# Türkiye Gezi Atlası 🧭

81 ilin interaktif gezi atlası. Tek bir HTML dosyası olan prototip, kurulabilir
(installable) bir **PWA — Progressive Web App**'e dönüştürülmüştür.

## Özellikler

- **İnteraktif harita** — kaydırılabilir/yakınlaştırılabilir SVG Türkiye haritası, il etiketleri
- **İl kartları** — her il için slogan, tarih, gezilecek yerler, yöresel lezzetler ve lokanta önerileri
- **Gezi defteri** — gezdiğin illeri işaretle, harita yeşile dönsün, pasaport damgan dolsun (81/81)
- **Sesli rehber** — konumdan en yakın noktaları bulur ve tarayıcının ses sentezleyicisiyle (TR/EN) anlatır
- **Arama** — plaka koduna veya il adına göre hızlı arama
- **Çevrimdışı çalışır** — servis çalışanı uygulama kabuğunu önbelleğe alır
- **Kurulabilir** — telefonda/masaüstünde "Ana ekrana ekle" ile bağımsız uygulama gibi açılır
- **Kalıcı kayıt** — gezilen iller tarayıcı `localStorage`'ında saklanır

## Uygulama haline getirmek için yapılanlar

Yüklenen tek dosyalık prototip şu değişikliklerle gerçek bir uygulamaya çevrildi:

1. **Kalıcılık düzeltildi** — prototip, yalnızca Claude artifact ortamında var olan
   `window.storage`'a bağlıydı; artık öncelikle tarayıcı `localStorage`'ı kullanılıyor
   (artifact ortamı yedek olarak korundu). Böylece gezilen iller gerçek tarayıcıda kalıcı olur.
2. **PWA manifesti** (`manifest.webmanifest`) — ad, ikonlar, tema rengi, `standalone` görünüm.
3. **Servis çalışanı** (`sw.js`) — çevrimdışı destek ve hızlı açılış için önbellekleme.
4. **Uygulama ikonları** (`icons/`) — 192/512 px, maskable ve Apple touch ikonları.
5. **Mobil/PWA meta etiketleri** — tema rengi, apple-mobile-web-app, favicon.

## Yerelde çalıştırma

Servis çalışanı ve manifest için dosyaların bir HTTP sunucusundan (dosya:// değil)
sunulması gerekir:

```bash
python3 -m http.server 8000
# tarayıcıda aç: http://localhost:8000
```

Alternatif (Node): `npx serve` veya `npx http-server -p 8000`.

## Yayınlama (deploy)

Tamamen statik bir sitedir; herhangi bir statik barındırıcıya yüklenebilir:

- **GitHub Pages** — Settings → Pages → Branch: `main`, klasör: `/ (root)` → Save.
  Adres: `https://ilyasyildiz1.github.io/turkiyegeziatlasi/`
- **Netlify / Vercel / Cloudflare Pages** — klasörü sürükle-bırak veya bağla
- **Render (Static Site)** — Publish directory: `.`

> PWA kurulumu ve konum servisi (sesli rehber) **HTTPS** gerektirir. `localhost`
> istisnadır ve geliştirme sırasında HTTPS'siz çalışır.

## Dosya yapısı

```
turkiyegeziatlasi/
├── index.html              # uygulama (harita, veriler, mantık)
├── manifest.webmanifest    # PWA manifesti
├── sw.js                   # servis çalışanı (çevrimdışı önbellek)
├── icons/                  # uygulama ikonları (+ kaynak icon.svg)
└── README.md
```

## Lisanslar ve atıflar

- **Türkiye SVG haritası:** [dnomak/svg-turkiye-haritasi](https://github.com/dnomak/svg-turkiye-haritasi) — MIT Lisansı, © 2015 Doğukan Güven Nomak. Tam metin: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)
- **Yazı tipleri:** Fraunces ve Manrope (Google Fonts, SIL OFL 1.1)
- **İçerik:** İl tanıtım metinleri, gezi önerileri ve sesli rehber anlatımları bu proje için özgün olarak yazılmıştır. Lokanta önerileri editoryal derlemedir; puan/yorum verisi içermez.

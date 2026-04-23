

## Tor Anonim Yayın — Tam Paket

Tüm 4 maddeyi sırayla yapacağım. Hedef ortam (VPS / Raspberry Pi) ikisini de destekleyecek şekilde dökümanı genişleteceğim.

### 1. `TOR_DEPLOYMENT.md` genişletme
- **VPS vs Raspberry Pi karşılaştırma tablosu** (maliyet, hız, anonimlik, risk)
- Her bölüme detaylı komut blokları + her komutun ne yaptığı
- Tor Browser test + curl test örnekleri
- Yaygın hatalar ve çözümleri (permission, port çakışması, hidden service hostname yok)
- Veri yedekleme ve restore (LUKS + GPG + rsync over tor)
- Monitoring (logsuz nasıl izlenir — vnstat, htop, sadece local)

### 2. Otomatik kurulum scripti — `scripts/deploy-tor.sh`
Tek komutla Debian 12 sunucuya:
- Sistem hardening (UFW, fail2ban, UTC, server_tokens off)
- `tor`, `nginx`, `nodejs`, `docker`, `docker-compose` kurulumu
- Self-hosted Supabase (`docker compose up -d`)
- Hidden service (`/etc/tor/torrc` config)
- nginx config (CSP + security headers + no logs)
- PM2 + uygulama build
- Sonunda `.onion` adresini ekrana basar

Kullanım: `curl -fsSL ... | bash` veya `bash deploy-tor.sh`

### 3. Self-host migration paketi — `scripts/migrate-to-selfhost.md` + SQL/script'ler
- `scripts/dump-cloud-db.sh` — Lovable Cloud'dan PostgreSQL dump alma (`pg_dump` üzerinden)
- `scripts/restore-selfhost.sh` — Self-hosted Supabase'e import
- `scripts/migrate-edge-functions.md` — 3 edge function (`check-payment-status`, `create-payment-address`, `kizilyurek-chat`) için self-host adaptasyon notları
- `scripts/env-template-selfhost.txt` — Self-host için `.env` şablonu
- `kizilyurek-chat` → Lovable AI Gateway yok, OpenRouter/OpenAI key alternatifi (torsocks ile)

### 4. Uygulamayı "Tor-ready" yapma
Kodda Tor üzerinde çalışmayı bozacak şeyleri temizle:

- **External font/CDN denetimi**: `index.html` ve `styles.css` taraması — Google Fonts, jsDelivr varsa kaldır, system font stack kullan
- **WebRTC denetimi**: `RTCPeerConnection` aramaları (yoksa zaten temiz, doğrula)
- **Geolocation denetimi**: `navigator.geolocation` çağrısı (DeadDropMap kontrol)
- **External image kontrolü**: `<img src="https://...">` taraması — varsa local'e taşı
- **CSP meta tag** ekleme: `__root.tsx`'a strict CSP (`default-src 'self'`)
- **Source map** kapatma: `vite.config.ts` → `build.sourcemap: false`
- **Build-time leak**: `console.log` production'da strip (vite minifier ayarı)
- **Yeni component**: `src/components/TorBadge.tsx` — kullanıcıya "Tor üzerinden bağlandın ✓" gösterir (`window.location.hostname.endsWith('.onion')` ile)

### Teknik detaylar
- Script'ler `scripts/` klasörüne (yeni klasör)
- `deploy-tor.sh` POSIX shell, `set -euo pipefail`, idempotent (yeniden çalıştırılabilir)
- Vite config'de `terserOptions.compress.drop_console: true` (production)
- CSP whitelist: sadece `'self'` + `data:` (image için) + `'unsafe-inline'` (Tailwind/shadcn için zorunlu)
- TorBadge sidebar'a footer olarak eklenecek

### Dosya değişikliği özeti
- **Düzenlenecek:** `TOR_DEPLOYMENT.md`, `vite.config.ts`, `src/routes/__root.tsx`, `src/components/AppSidebar.tsx`, `src/styles.css` (gerekirse)
- **Oluşturulacak:** `scripts/deploy-tor.sh`, `scripts/dump-cloud-db.sh`, `scripts/restore-selfhost.sh`, `scripts/migrate-edge-functions.md`, `scripts/env-template-selfhost.txt`, `src/components/TorBadge.tsx`

Onaylarsan sırayla uygularım.


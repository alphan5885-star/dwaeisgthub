# 🧅 Tor Üzerinde Anonim Yayın Rehberi (.onion)

> **ÖNEMLİ**: Lovable Cloud (Cloudflare Workers) üzerinde çalışan bir uygulamayı doğrudan `.onion` adresi olarak yayınlamak **mümkün değildir**. Tor hidden service kendi sunucunu gerektirir. Bu rehber, projeyi kendi (anonim) sunucuna taşıyıp Tor üzerinden yayınlama adımlarını gösterir.

---

## ⚡ Hızlı başlangıç (otomatik)

Hazır script'lerle:

```bash
# 1. Sunucuya Tor üzerinden bağlan
torsocks ssh root@<sunucu>

# 2. Tek komutla kur
curl -fsSL https://raw.githubusercontent.com/<senin-repon>/main/scripts/deploy-tor.sh | bash
# veya: bash scripts/deploy-tor.sh

# 3. Lovable Cloud'dan veriyi taşı
CLOUD_DB_URL='postgres://...' bash scripts/dump-cloud-db.sh
bash scripts/restore-selfhost.sh cloud-dump-*.sql.gpg
```

Manuel kurulum için aşağıdaki adımları izle.

---

## VPS vs Raspberry Pi — Hangisi?

| Kriter | VPS (Njalla/Cockbox) | Raspberry Pi (ev) |
|--------|----------------------|-------------------|
| **Maliyet** | ~10-30 €/ay (XMR) | Donanım ~70 € + elektrik |
| **Hız** | Yüksek (1Gbps) | Ev internetine bağlı |
| **Anonimlik** | Sağlayıcıya güven gerekir | Sadece Tor → IP hiç sızmaz |
| **Fiziksel risk** | Sağlayıcı disk imajı alabilir | Evinde — fiziksel arama riski |
| **Uptime** | %99.9 | Elektrik/internet kesintisi |
| **Yedek** | Snapshot kolay | Disk/SD imajı manuel |
| **Bandwidth** | Sınırsız (genelde) | ISP'nin upload limiti |
| **Kim için?** | Yüksek trafik, küresel | Küçük topluluk, düşük profil |

**Önerim:** Başlangıçta VPS (kolay), trafik artarsa kendi Pi/server (kontrol).

---

## Mimari

```
[Tor Browser] → [Tor ağı] → [Hidden Service: xxxxx.onion]
                              ↓
                         [Senin VPS / Raspberry Pi]
                              ↓
                         [nginx :80] → [Node.js app :3000]
                              ↓
                         [Self-hosted Supabase / Postgres]
```

**Asla** Tor üzerinden Lovable Cloud'a (clearnet) proxy yapma — anonimlik garantisi sıfırlanır.

---

## 1. Anonim sunucu edin

- **Tercih sırası**: Monero ile ödenebilen VPS (Njalla, BitLaunch, Cockbox), kendi Raspberry Pi (ev IP'si ile bağ kurmaz çünkü sadece Tor üzerinden açılacak), seedbox.
- Ödeme: XMR (Monero) > BTC (mixed) > kripto ödemeli prepaid kart.
- Kayıt e-postası: ProtonMail / Tutanota üzerinden Tor ile açılmış.
- Sunucuya **sadece Tor üzerinden** SSH ile bağlan (clearnet IP'in log'a düşmesin).

---

## 2. Sunucuyu hazırla (Debian 12 örnek)

```bash
# Temel paketler
apt update && apt install -y tor nginx nodejs npm git curl ufw fail2ban

# Firewall — sadece localhost'tan erişim
ufw default deny incoming
ufw default allow outgoing
ufw allow from 127.0.0.1
ufw enable

# Sistem saatini gizle (timezone fingerprint)
timedatectl set-timezone UTC
```

---

## 3. Projeyi kendi sunucuna taşı

Lovable Cloud (Supabase + Workers) yerine self-host:

```bash
# Self-hosted Supabase (Docker)
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
# .env içindeki POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY vb. değiştir
docker compose up -d

# Lovable projesini GitHub üzerinden klonla
git clone https://github.com/<senin-repon>/aeigsthub
cd aeigsthub
npm install

# .env güncelle:
# VITE_SUPABASE_URL=http://127.0.0.1:8000
# VITE_SUPABASE_PUBLISHABLE_KEY=<self-host anon key>

npm run build
# tanstack-start build çıktısını node ile çalıştır:
node .output/server/index.mjs   # port 3000
```

PM2 ile süreklilik:
```bash
npm i -g pm2
pm2 start ".output/server/index.mjs" --name aeigsth
pm2 startup && pm2 save
```

---

## 4. Tor hidden service kur

`/etc/tor/torrc` dosyasının sonuna ekle:

```
HiddenServiceDir /var/lib/tor/aeigsth/
HiddenServicePort 80 127.0.0.1:3000

# v3 onion (default), client auth opsiyonel:
# HiddenServiceVersion 3
# HiddenServiceAuthorizeClient stealth alice,bob
```

```bash
systemctl restart tor
cat /var/lib/tor/aeigsth/hostname
# → xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.onion
```

Bu adresi Tor Browser'da test et.

---

## 5. Vanity .onion adresi (opsiyonel)

İlk 6-7 karakteri seçili .onion için:

```bash
# mkp224o (v3 onion adresleri için)
git clone https://github.com/cathugger/mkp224o
cd mkp224o && ./autogen.sh && ./configure && make
./mkp224o aeigst -d ./onions -t 8
```

`aeigstxxxxxxx...onion` formatında adres üretir. Üretilen klasörü `/var/lib/tor/aeigsth/` içine kopyala (chown debian-tor:debian-tor, chmod 700) ve tor'u yeniden başlat.

---

## 6. Deanonimizasyon riskini azaltma

| Risk | Önlem |
|------|-------|
| **Time correlation** | Sistem saati = UTC, NTP bile Tor üzerinden (`tor-resolve`) |
| **DNS leak** | nginx/uygulama içinde harici domain çağrısı yapma. CDN, Google Fonts, harici favicon, harici görsel — **hepsi yasak**. Hepsi self-host edilecek. |
| **WebRTC / IP leak** | Uygulamada `RTCPeerConnection` kullanma. Tor Browser zaten engeller. |
| **JS fingerprint** | Canvas/WebGL/AudioContext fingerprint — Tor Browser default ayarda korur, ama uygulamayı bunlardan **bağımsız** tasarla. |
| **Server header leak** | nginx'te `server_tokens off;`, `more_clear_headers Server;` |
| **Error stack trace** | Production build, source map kapalı (`build.sourcemap: false`) |
| **Account correlation** | Aynı PGP key / aynı kullanıcı adı clearnet'te varsa → bağ kurulur. Tüm hesaplar Tor-only ve sıfırdan. |
| **File metadata** | Yüklenen görsel/PDF EXIF'leri sunucu tarafında **mutlaka** strip et (exiftool, sharp metadata: false). |

---

## 7. nginx (opsiyonel reverse proxy)

`/etc/nginx/sites-available/aeigsth`:

```nginx
server {
    listen 127.0.0.1:80;
    server_name _;
    server_tokens off;

    # Tor Browser için ek güvenlik header'ları
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "interest-cohort=(), geolocation=(), camera=(), microphone=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'" always;
    add_header Onion-Location "http://YOUR.onion$request_uri" always;

    # Tor için no-cache (timing attack)
    add_header Cache-Control "no-store, no-cache, must-revalidate" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_hide_header Server;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/aeigsth /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

`torrc` güncelle: `HiddenServicePort 80 127.0.0.1:80`.

---

## 8. Operasyonel anonimlik (OPSEC)

- **SSH bağlantısı**: `torsocks ssh -p 22 root@<onion>` — clearnet IP'in asla bağlanmasın.
- **Git push**: Aynı şekilde Tor üzerinden, GitHub yerine [Codeberg](https://codeberg.org) veya kendi self-hosted Gitea (onion).
- **Yedek**: Disk şifreli (LUKS), yedekler GPG ile şifrelenmiş, S3/B2'ye değil — başka bir onion'a `rsync over tor`.
- **Log temizliği**: nginx `access_log off;`, uygulama loglarında IP/User-Agent yok, `journalctl --vacuum-time=1d`.
- **Acil kapatma**: `systemctl stop tor nginx postgres && shred -uvz /var/lib/tor/aeigsth/*` — uygulamadaki **PanicButton** komponenti zaten DB tarafında pending order'ları iptal ediyor; sunucu tarafında da bir `panic.sh` hazırla.

---

## 9. Test

```bash
# Tor Browser'da:
http://xxxxxxxxxx.onion

# Komut satırından:
torsocks curl -I http://xxxxxxxxxx.onion
```

`Onion-Location` header'ı ile clearnet ziyaretçileri otomatik onion adresine yönlendirebilirsin (yalnızca ayrıca bir clearnet alan adın varsa).

---

## 10. Yasal uyarı

Bu rehber **operasyonel güvenlik** ve **mahremiyet** için yazılmıştır (whistleblower platformları, gazetecilik, sansür altındaki bilgi paylaşımı vb.). Yürürlükteki yasalara uygun olmayan içerik barındırmak senin sorumluluğundur.

---

## Özet checklist

- [ ] Anonim ödeme ile VPS / kendi donanımın
- [ ] Sunucuya sadece Tor üzerinden SSH
- [ ] Self-host Supabase + Lovable build
- [ ] `tor` paketi + `HiddenServiceDir` ayarı
- [ ] Vanity onion (opsiyonel)
- [ ] nginx hardening + CSP + Onion-Location
- [ ] Hiçbir external CDN / Google Fonts / harici çağrı
- [ ] Log'lar kapalı, source map kapalı, server_tokens off
- [ ] Yedek + panic prosedürü

---

## 11. Yaygın hatalar ve çözümleri

| Hata | Sebep | Çözüm |
|------|-------|-------|
| `cat: hostname: No such file` | tor servis henüz hidden service üretmedi | `systemctl status tor` → 30sn bekle, log'a bak: `journalctl -u tor -n 50` |
| `Permission denied: /var/lib/tor/aeigsth` | Yanlış sahiplik | `chown -R debian-tor:debian-tor /var/lib/tor/aeigsth && chmod 700 /var/lib/tor/aeigsth` |
| `nginx: bind to 0.0.0.0:80 failed` | Apache veya başka servis 80'de | `lsof -i :80` ile bul, durdur. `listen 127.0.0.1:80` kullan. |
| Tor Browser "Onion site not found" | torrc yanlış / tor restart edilmedi | `tor --verify-config` → `systemctl restart tor` |
| `502 Bad Gateway` | Node app çalışmıyor | `pm2 status` → `pm2 logs aeigsth` |
| Supabase `connection refused` | Docker container ayakta değil | `cd /opt/aeigsth/supabase/docker && docker compose ps` |
| `.onion` çok yavaş | Normal — Tor 6 hop | Hidden Service Onionbalance ile load-balance et |
| Build başarısız: `vite not found` | `npm install` yapılmadı | `cd /opt/aeigsth/app && npm install` |

## 12. Logsuz monitoring

Geleneksel monitoring (Datadog, Sentry, vb.) tüm anonimliği bozar. Sadece **lokal**:

```bash
# CPU/RAM
htop

# Bandwidth (IP'siz)
vnstat -l -i eth0

# Disk
ncdu /

# Tor circuit durumu
nyx   # apt install nyx → grafiksel tor monitor

# Uygulama (PM2)
pm2 monit
```

`nyx` özellikle önemli: hidden service circuit'lerini, bant genişliği kullanımını gösterir, log dosyasına yazmaz.

## 13. Acil panic

```bash
# /usr/local/bin/panic.sh
#!/bin/bash
systemctl stop tor nginx docker
shred -uvz /var/lib/tor/aeigsth/hs_ed25519_*
rm -rf /opt/aeigsth/app/.env /opt/aeigsth/supabase/docker/.env
# Disk LUKS ise:
cryptsetup luksErase /dev/sda2
shutdown -h now
```

Sonra: `chmod 700 /usr/local/bin/panic.sh`. Uygulamadaki `PanicButton` bunu SSH üzerinden tetikleyebilir (ayrı bir webhook).

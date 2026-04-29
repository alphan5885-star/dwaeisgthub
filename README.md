# aeigsthub

TanStack Start + React + Vite + Supabase tabanli web uygulamasi.

## Hizli Baslangic

Gereksinimler:

- Node.js 22 veya daha yeni
- npm 10 veya daha yeni

Kurulum:

```bash
npm install
cp .env.example .env
npm run dev
```

Windows PowerShell script policy `npm` calistirmayi engellerse `npm.cmd` kullan:

```powershell
npm.cmd install
npm.cmd run dev
```

Yerel adres varsayilan olarak:

```text
http://127.0.0.1:5173/
```

Cloud/remote IDE ortamlarinda dis agdan erisim icin:

```bash
npm run dev:host
```

## Ortam Degiskenleri

`.env.example` dosyasini `.env` olarak kopyala ve Supabase bilgilerini doldur.

Zorunlu alanlar:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

## Komutlar

```bash
npm run dev       # local gelistirme
npm run dev:light # hafif gelistirme modu
npm run dev:host  # Cursor/IDX/remote preview icin 0.0.0.0 host
npm run dev:light:host # remote preview icin hafif mod
npm run build     # production build
npm run preview   # build onizleme
npm run doctor    # ortam ve temel dosya kontrolu
npm run health    # calisan dev server HTTP kontrolu
npm run todos     # TODO/FIXME/HACK/XXX listesi
npm run routes    # TanStack route dosyalarini listeler
npm run map       # proje dosya haritasi
npm run typecheck # TypeScript kontrolu
npm run lint      # eslint
npm run clean     # build/cache ciktilarini temizler
npm run check     # lint + build
```

## Hafif Gelistirme Modu

AI IDE'lerde ve dusuk kaynakli ortamlarda daha hizli, daha sessiz bir deneyim icin:

```bash
npm run dev:light
```

Remote preview gereken ortamlarda:

```bash
npm run dev:light:host
```

Bu mod `.env.light` icindeki `VITE_LIGHT_DEV=true` bayragi ile calisir. Gelistirme sirasinda su runtime parcalari kapatilir:

- SecurityProvider yan etkileri
- Tor warning banner
- Security HUD
- Background music iframe/button

Production build ve normal `npm run dev` davranisi degismez.

## AI IDE Notlari

Cursor, Trae, Lovable.dev, Google IDX ve benzeri ortamlarda calisirken once `AGENTS.md` dosyasini oku. Projenin ana girisleri:

- `src/routes/__root.tsx`: root shell, providers, meta/CSP
- `src/pages/Login.tsx`: giris/kayit ekrani
- `src/lib/authContext.tsx`: auth/session akisi
- `src/integrations/supabase/client.ts`: browser Supabase client
- `src/routeTree.gen.ts`: otomatik uretilir, manuel edit yapma

## Notlar

- Proje npm ile calisacak sekilde ayarlandi; `bun` zorunlu degil.
- TanStack route tree dev server sirasinda otomatik guncellenebilir.
- `.env` commitlenmez; sadece `.env.example` paylasilir.
- Sorun giderme icin `TROUBLESHOOTING.md` dosyasina bak.
- Katki ve handoff akisi icin `CONTRIBUTING.md` dosyasina bak.

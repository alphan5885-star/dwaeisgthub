# AI Development Guide

Bu dosya Cursor, Trae, Codex, Lovable.dev ve benzeri AI yazilim gelistirme ortamlarinin projeyi hizli anlamasi icindir.

## Stack

- React 19
- TanStack Start / TanStack Router
- Vite 7
- TypeScript
- Tailwind CSS 4
- Radix UI
- Supabase

## Calistirma

```bash
npm install
npm run dev
```

Remote/preview tabanli IDE'lerde:

```bash
npm run dev:host
```

En hafif AI IDE deneyimi icin:

```bash
npm run dev:light
npm run dev:light:host
```

Build kontrolu:

```bash
npm run check
```

Hizli ortam teshisi:

```bash
npm run doctor
npm run health
npm run todos
npm run routes
npm run map
```

## Proje Haritasi

- `src/routes/`: file-based routes
- `src/pages/`: sayfa componentleri
- `src/components/`: tekrar kullanilan UI ve ozellik componentleri
- `src/components/ui/`: shadcn/Radix tabanli primitives
- `src/lib/`: context, auth, security, helper kodlari
- `src/integrations/supabase/`: Supabase client ve tipleri
- `supabase/`: database/migration kaynaklari

## Kurallar

- `src/routeTree.gen.ts` otomatik uretilir. Gerekmedikce manuel degistirme.
- Hizli iterasyon icin `dev:light` kullan. Bu mod security HUD, Tor banner ve background music gibi gelistirme disi runtime katmanlarini kapatir.
- Yeni route eklerken `src/routes` icindeki mevcut dosya adlandirma stilini takip et.
- UI icin mevcut Radix/shadcn componentlerini kullan.
- Supabase anahtarlari `.env` icinde kalmali. `.env.example` disinda secret commitlenmemeli.
- Build script npm uyumludur; bun kullanmak zorunlu degildir.
- CSP ayarlari `src/routes/__root.tsx` icindedir. Dev bootstrap calismasi icin inline script izni bulunur.
- Cache/build temizlemek gerekirse `npm run clean` kullan. Bu sadece `dist`, `.tanstack`, `.wrangler` ve lokal dev loglarini siler.
- Hata ayiklamaya baslamadan once `TROUBLESHOOTING.md` dosyasindaki bilinen sorunlari kontrol et.

## Sik Karsilasilan Sorunlar

- PowerShell `npm.ps1` script policy hatasi verirse `npm.cmd run dev` kullan.
- Login ekrani siyah kalirsa CSP veya client hydration hatalarini kontrol et.
- Supabase auth calismiyorsa once `.env` degerlerini ve proje URL/key uyumunu kontrol et.

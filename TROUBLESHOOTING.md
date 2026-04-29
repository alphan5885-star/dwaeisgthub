# Troubleshooting

## PowerShell npm.ps1 Hatasi

Windows PowerShell script policy `npm` komutunu engellerse:

```powershell
npm.cmd run dev
```

## Siyah Ekran / Login Gorunmuyor

Muhtemel nedenler:

- CSP client bootstrap scriptlerini engelliyor.
- Browser cache eski HTML/JS tutuyor.
- Dev server eski process ile calisiyor.

Denenecekler:

```bash
npm run dev:light
```

Tarayicida hard refresh:

```text
Ctrl + F5
```

## Supabase Hatalari

`.env` icinde su alanlari kontrol et:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

Hizli kontrol:

```bash
npm run doctor
```

## Route Nerede?

Route listesini gormek icin:

```bash
npm run routes
```

Proje haritasi icin:

```bash
npm run map
```

## Dev Server Ayakta mi?

Dev server calisirken:

```bash
npm run health
```

Farkli URL kontrol etmek icin:

```bash
APP_HEALTH_URL=http://127.0.0.1:5174/ npm run health
```

## Build Sandbox/EPERM

Windows veya sandbox ortamlarda esbuild child process baslatirken `EPERM` verebilir. Normal terminalde tekrar dene:

```bash
npm run build
```

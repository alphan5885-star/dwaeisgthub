# Edge Functions — Self-Host'a Taşıma

Lovable Cloud'daki 3 edge function self-hosted Supabase'e nasıl taşınır:

## 1. `check-payment-status` & `create-payment-address`

Bu ikisi blockchain API çağrısı yapıyor. Self-host'ta:

```bash
cd /opt/aeigsth/supabase
npx supabase functions deploy check-payment-status --no-verify-jwt
npx supabase functions deploy create-payment-address --no-verify-jwt
```

**Önemli — Tor için:**

- Tüm dış API çağrılarını `torsocks` veya SOCKS5 proxy üzerinden yap
- `BlockCypher`, `Blockchain.info` gibi tracker'lar IP loglar → Tor zorunlu
- Deno fetch için `Deno.env.get("HTTP_PROXY")` ile `socks5://127.0.0.1:9050` set et

```ts
// supabase/functions/_shared/torFetch.ts
const TOR_PROXY = "socks5://127.0.0.1:9050";
export const torFetch = (url: string, init?: RequestInit) =>
  fetch(url, { ...init, client: Deno.createHttpClient({ proxy: { url: TOR_PROXY } }) });
```

## 2. `kizilyurek-chat` — Lovable AI Gateway YOK

Self-host'ta `LOVABLE_API_KEY` çalışmaz. Alternatif:

### Seçenek A — OpenRouter (önerilir, anonim ödeme)

```ts
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [...],
  }),
});
```

**Tor üzerinden:** OpenRouter'a torsocks ile çağrı yap (yukarıdaki `torFetch`).

### Seçenek B — Yerel Ollama (tamamen offline)

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:8b
```

Edge function'ı `http://127.0.0.1:11434/api/chat`'e yönlendir. **Hiçbir dış API çağrısı yok** = en güvenli.

## 3. Secret'ları taşıma

Self-host'ta `.env` veya `supabase secrets set`:

```bash
cd /opt/aeigsth/supabase
npx supabase secrets set OPENROUTER_API_KEY=sk-or-...
npx supabase secrets set BLOCKCYPHER_TOKEN=...
```

## 4. URL güncelleme (uygulama tarafı)

`/opt/aeigsth/app/.env`:

```
VITE_SUPABASE_URL=http://127.0.0.1:8000
```

Edge function URL'leri otomatik `http://127.0.0.1:8000/functions/v1/<name>` olur — kod değişikliği gerekmez.

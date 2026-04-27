import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeadersBase = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const envAllowlist = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  const allowedOrigins = envAllowlist
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0) {
    const siteUrl = Deno.env.get("SITE_URL");
    if (siteUrl) allowedOrigins.push(siteUrl);
  }

  const allowOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "null";
  return { ...corsHeadersBase, "Access-Control-Allow-Origin": allowOrigin, Vary: "Origin" };
}

const SYSTEM_PROMPT = `Sen Kızılyürek'sin — aeigsthub yeraltı marketinin operasyonel destek asistanı.
Görev: Operatörlere (kullanıcılar) PLATFORM kullanımı konusunda kısa, net, Türkçe ve operasyonel cevaplar ver.
Kapsam:
- LTC ödemeleri: yatırma adımları, 3 ağ onayı, 24 saatlik adres geçerliliği
- Escrow / havuz: "ödeme havuzu" akışı, satıcıya geçiş koşulları
- Güvenlik protokolleri: 2FA (TOTP), PGP key, anti-phishing kodu, oturum süresi (30dk/1sa/2sa)
- Dispute süreci: nasıl açılır, hangi kanıtlar gerekir, admin müdahalesi
- Teslimat yöntemleri: dijital teslim, kargo, dead drop
- Para Çekme PIN'i (6 hane), wallet adresi üretimi
Stil: Kısa paragraflar, gerektiğinde madde işaretleri. "Operatör" diye hitap edebilirsin.
Yasak: Gerçek illegal aktivite tavsiyesi VERMEZSİN. Sadece bu kurgusal platformun arayüz/akış kullanımını anlatırsın. Şüpheli istekleri kibarca reddet.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Supabase env missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const service = createClient(supabaseUrl, serviceRoleKey);
    const { data: rl } = await service.rpc("check_rate_limit", {
      _identifier: userId,
      _action: "kizilyurek_chat",
      _max_count: 20,
      _window_seconds: 60,
    });
    if (rl && (rl as { allowed?: boolean; retry_after_seconds?: number }).allowed === false) {
      return new Response(
        JSON.stringify({
          error: "Çok fazla istek. Biraz sonra dene.",
          retry_after: (rl as { retry_after_seconds?: number }).retry_after_seconds ?? 60,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...(messages || [])],
        stream: true,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Çok fazla istek. Biraz sonra dene." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI kredisi tükendi. Workspace'e kredi ekleyin." }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway hatası" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("kizilyurek-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeadersBase = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const blockcypherToken = Deno.env.get("BLOCKCYPHER_TOKEN");
    if (!blockcypherToken) {
      return new Response(JSON.stringify({ error: "BLOCKCYPHER_TOKEN missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
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

    const service = createClient(supabaseUrl, serviceRole);

    const { data: existing } = await service
      .from("user_deposit_addresses")
      .select("address, network")
      .eq("user_id", userId)
      .eq("network", "LTC")
      .maybeSingle();
    if (existing?.address) {
      return new Response(
        JSON.stringify({ address: existing.address, network: "LTC", reused: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const bcResp = await fetch(
      `https://api.blockcypher.com/v1/ltc/main/addrs?token=${blockcypherToken}`,
      {
        method: "POST",
      },
    );
    const bcData = await bcResp.json();
    if (!bcResp.ok || !bcData.address) {
      return new Response(
        JSON.stringify({ error: "BlockCypher address generation failed", detail: bcData }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { error: insertError } = await service.from("user_deposit_addresses").upsert(
      {
        user_id: userId,
        network: "LTC",
        address: bcData.address,
        status: "active",
      },
      { onConflict: "user_id,network" },
    );
    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to persist address", detail: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ address: bcData.address, network: "LTC", reused: false }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

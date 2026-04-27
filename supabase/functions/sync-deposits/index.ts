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
    const { data: depositAddress } = await service
      .from("user_deposit_addresses")
      .select("address")
      .eq("user_id", userId)
      .eq("network", "LTC")
      .maybeSingle();
    if (!depositAddress?.address) {
      return new Response(JSON.stringify({ credited: 0, address_found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bcResp = await fetch(
      `https://api.blockcypher.com/v1/ltc/main/addrs/${depositAddress.address}/full?limit=50&token=${blockcypherToken}`,
    );
    const bcData = await bcResp.json();
    if (!bcResp.ok) {
      return new Response(JSON.stringify({ error: "BlockCypher error", detail: bcData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let creditedCount = 0;
    for (const tx of bcData.txs || []) {
      const confirmations = Number(tx.confirmations ?? 0);
      if (confirmations < 3) continue;
      const txHash = String(tx.hash || "");
      if (!txHash) continue;

      let amountSatoshi = 0;
      for (const out of tx.outputs || []) {
        if ((out.addresses || []).includes(depositAddress.address)) {
          amountSatoshi += Number(out.value || 0);
        }
      }
      if (amountSatoshi <= 0) continue;

      const { data: creditResult, error: creditErr } = await service.rpc(
        "credit_confirmed_deposit",
        {
          _user_id: userId,
          _address: depositAddress.address,
          _tx_hash: txHash,
          _amount_satoshi: amountSatoshi,
          _confirmations: confirmations,
        },
      );
      if (!creditErr && (creditResult as { credited?: boolean } | null)?.credited) {
        creditedCount += 1;
      }
    }

    const { data: balance } = await service
      .from("user_balances")
      .select("available, pending, total")
      .eq("user_id", userId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        credited: creditedCount,
        address_found: true,
        balance: balance ?? { available: 0, pending: 0, total: 0 },
      }),
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

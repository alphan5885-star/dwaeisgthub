// Generates a temporary LTC payment address via BlockCypher and saves it to the order
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("BLOCKCYPHER_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "BlockCypher not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id } = await req.json();
    if (!order_id || typeof order_id !== "string") {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
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

    // Rate limit: 5 address generations per 60 seconds per user
    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rl } = await service.rpc("check_rate_limit", {
      _identifier: userId,
      _action: "create_payment_address",
      _max_count: 5,
      _window_seconds: 60,
    });
    if (rl && (rl as any).allowed === false) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retry_after: (rl as any).retry_after_seconds,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify order belongs to this buyer
    const { data: order, error: orderErr } = await service
      .from("orders")
      .select("id, buyer_id, payment_address")
      .eq("id", order_id)
      .maybeSingle();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.buyer_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already has an address, return it
    if (order.payment_address) {
      return new Response(JSON.stringify({ address: order.payment_address, reused: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a new LTC address from BlockCypher
    const bcResp = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs?token=${token}`, {
      method: "POST",
    });
    const bcData = await bcResp.json();
    if (!bcResp.ok || !bcData.address) {
      console.error("BlockCypher error", bcData);
      return new Response(JSON.stringify({ error: "Address generation failed", detail: bcData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await service
      .from("orders")
      .update({
        payment_address: bcData.address,
        payment_status: "awaiting_payment",
      })
      .eq("id", order_id);

    return new Response(JSON.stringify({ address: bcData.address }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

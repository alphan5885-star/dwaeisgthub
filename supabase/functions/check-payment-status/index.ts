// Polls BlockCypher for confirmations on the order's payment address and triggers RPC
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = Deno.env.get("BLOCKCYPHER_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "BlockCypher not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    const service = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order } = await service.from("orders").select("id, buyer_id, vendor_id, payment_address, amount, payment_status, confirmations").eq("id", order_id).maybeSingle();
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (order.buyer_id !== userId && order.vendor_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!order.payment_address) {
      return new Response(JSON.stringify({ status: "no_address", confirmations: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Query BlockCypher for the address full info
    const bcResp = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${order.payment_address}/full?limit=5&token=${token}`);
    const bcData = await bcResp.json();
    if (!bcResp.ok) {
      console.error("BC poll err", bcData);
      return new Response(JSON.stringify({ error: "BlockCypher error", detail: bcData }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find the highest confirmation count among incoming txs
    let maxConfirmations = 0;
    let totalReceived = 0;
    for (const tx of bcData.txs || []) {
      const conf = tx.confirmations ?? 0;
      if (conf > maxConfirmations) maxConfirmations = conf;
      // Sum outputs going to our address
      for (const out of tx.outputs || []) {
        if ((out.addresses || []).includes(order.payment_address)) {
          totalReceived += out.value || 0;
        }
      }
    }

    const cap = Math.min(maxConfirmations, 6);

    // Trigger RPC (handles idempotency)
    const { data: rpcData, error: rpcErr } = await service.rpc("process_payment_confirmation", {
      _order_id: order_id,
      _confirmations: cap,
    });

    if (rpcErr) console.error("RPC err", rpcErr);

    return new Response(JSON.stringify({
      confirmations: cap,
      required: 3,
      received_satoshi: totalReceived,
      status: cap >= 3 ? "confirmed" : (cap > 0 ? "confirming" : "awaiting_payment"),
      rpc: rpcData,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

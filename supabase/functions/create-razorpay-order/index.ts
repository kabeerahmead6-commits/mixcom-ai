import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan_id, billing_cycle } = await req.json();

    // Fetch plan details
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = billing_cycle === "yearly" ? plan.price_yearly : plan.price_monthly;

    if (amount === 0) {
      // Free plan - just create subscription directly
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 100); // basically never expires

      const { error: subError } = await supabase.from("user_subscriptions").insert({
        user_id: user.id,
        plan_id: plan.id,
        status: "active",
        billing_cycle,
        amount_paid: 0,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      if (subError) {
        return new Response(JSON.stringify({ error: subError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ free: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Razorpay order
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(JSON.stringify({ error: "Razorpay not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `sub_${user.id}_${Date.now()}`,
        notes: {
          user_id: user.id,
          plan_id: plan.id,
          plan_name: plan.name,
          billing_cycle,
        },
      }),
    });

    const order = await orderRes.json();

    if (!orderRes.ok) {
      console.error("Razorpay order creation failed:", order);
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: razorpayKeyId,
        plan_name: plan.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

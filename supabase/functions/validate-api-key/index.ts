import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SHA-256 hash
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Extract Bearer token
    const authHeader = req.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header. Use: Bearer <api_key>" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawKey = match[1];
    
    // Validate key format
    if (!rawKey.startsWith("mix-ai_live_")) {
      return new Response(JSON.stringify({ error: "Invalid API key format" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyHash = await hashKey(rawKey);

    // Use service role to bypass RLS for validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate key using security definer function
    const { data, error } = await supabase.rpc("validate_api_key", { p_key_hash: keyHash });

    if (error || !data || data.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid or expired API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyData = data[0];

    // Check rate limit using the increment function
    const { data: allowed, error: rlError } = await supabase.rpc("increment_api_key_usage", {
      p_key_id: keyData.key_id,
    });

    if (rlError || !allowed) {
      return new Response(JSON.stringify({
        error: "Rate limit exceeded",
        retry_after_seconds: 60,
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      });
    }

    // Key is valid — return user info
    return new Response(JSON.stringify({
      valid: true,
      user_id: keyData.owner_user_id,
      scopes: keyData.key_scopes,
      rate_limit: keyData.key_rate_limit,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("validate-api-key error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

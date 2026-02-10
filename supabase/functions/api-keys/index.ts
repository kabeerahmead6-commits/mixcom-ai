import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a secure random API key with prefix
function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(40)))
    .map((b) => chars[b % chars.length])
    .join("");
  return `mix-ai_live_${randomPart}`;
}

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // CREATE a new API key
    if (req.method === "POST" && action === "create") {
      const { name = "Unnamed Key", scopes = [], rate_limit_per_minute = 60, expires_at = null } = await req.json();

      const rawKey = generateApiKey();
      const keyHash = await hashKey(rawKey);
      const keyPrefix = rawKey.substring(0, 16);

      const { error: insertError } = await supabase.from("api_keys").insert({
        user_id: user.id,
        name: String(name).substring(0, 100),
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes,
        rate_limit_per_minute: Math.min(Math.max(Number(rate_limit_per_minute) || 60, 1), 1000),
        expires_at,
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to create API key" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return the raw key ONLY ONCE
      return new Response(JSON.stringify({
        key: rawKey,
        prefix: keyPrefix,
        name,
        message: "Save this key securely. It will NOT be shown again.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST user's API keys
    if (req.method === "GET" && action === "list") {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, scopes, is_active, last_used_at, expires_at, rate_limit_per_minute, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to fetch keys" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ keys: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // REVOKE (deactivate) an API key
    if (req.method === "POST" && action === "revoke") {
      const { key_id } = await req.json();
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", key_id)
        .eq("user_id", user.id);

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to revoke key" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE an API key
    if (req.method === "DELETE" && action === "delete") {
      const { key_id } = await req.json();
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", key_id)
        .eq("user_id", user.id);

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to delete key" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("api-keys error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

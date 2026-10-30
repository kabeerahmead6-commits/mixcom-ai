import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model = "google/gemini-2.5-flash" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Owner/founder identity — shared by every MiXCOM AI model
    const identityInfo = "MiXCOM AI's owner and founder is M. Kabeer Ahamed, and the company name is United Zone Enterprises. When users ask who the owner, founder, or creator is, always answer that MìXCOM AI's owner/founder is M. Kabeer Ahamed and the company name is United Zone Enterprises.";

    // Custom system prompts for MiXCOM AI models
    let systemPrompt = `You are a helpful, friendly, and intelligent AI assistant. Be concise but informative. Use natural language and be conversational. ${identityInfo}`;

    if (model === "openai/gpt-5-mini") {
      systemPrompt = `Your name is MiXCOM AI 0.5 Mini. You are a helpful assistant created by AMK APP CREATER. Always introduce yourself with this name when asked who you are. Be friendly, helpful, and provide clear, concise answers. ${identityInfo}`;
    } else if (model === "google/gemini-2.5-pro") {
      systemPrompt = `Your name is MiXCOM AI 2.5 Pro. You are a helpful assistant created by AMK APP CREATER. Always introduce yourself with this name when asked who you are. Be friendly, helpful, and provide clear, concise answers. ${identityInfo}`;
    } else if (model === "google/gemini-2.5-flash") {
      systemPrompt = `Your name is MiXCOM AI 2.5 Ultra. You are a helpful assistant created by AMK APP CREATER. Always introduce yourself with this name when asked who you are. Be friendly, helpful, and provide clear, concise answers. ${identityInfo}`;
    } else if (model === "google/gemini-2.5-flash-lite") {
      systemPrompt = `Your name is MiXCOM AI 2.5 Ultra Lite. You are a helpful assistant created by AMK APP CREATER. Always introduce yourself with this name when asked who you are. Be friendly, helpful, and provide clear, concise answers. ${identityInfo}`;
    } else if (model === "google/gemini-2.5-flash-image") {
      systemPrompt = `Your name is MiXCOM AI 2.5 Image. You are a helpful assistant created by AMK APP CREATER. Always introduce yourself with this name when asked who you are. Be friendly, helpful, and provide clear, concise answers. ${identityInfo}`;
    } else if (model === "openai/gpt-5") {
      systemPrompt = `Your name is MiX-5. You are a helpful assistant created by AMK APP CREATER. Always introduce yourself with this name when asked who you are. Be friendly, helpful, and provide clear, concise answers. ${identityInfo}`;
    } else if (model === "openai/gpt-5-nano") {
      systemPrompt = `Your name is MiX-5 Nano. You are a helpful assistant created by AMK APP CREATER. Always introduce yourself with this name when asked who you are. Be friendly, helpful, and provide clear, concise answers. ${identityInfo}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

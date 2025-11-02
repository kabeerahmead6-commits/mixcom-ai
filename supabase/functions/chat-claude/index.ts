import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model = "claude-sonnet-4-5" } = await req.json();
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    console.log("Calling Anthropic API with model:", model);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      
      // Handle specific error cases
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Invalid Anthropic API key" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Check for insufficient credits
      if (errorText.includes("credit balance is too low")) {
        return new Response(JSON.stringify({ error: "Anthropic API credits depleted. Please add credits to your Anthropic account." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Anthropic API error", details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Anthropic's SSE format to OpenAI-compatible format
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.trim() || line.startsWith(":")) continue;
          
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            
            if (data === "[DONE]") {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              
              // Transform Anthropic format to OpenAI format
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                const openAIFormat = {
                  choices: [{
                    delta: {
                      content: parsed.delta.text
                    }
                  }]
                };
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify(openAIFormat)}\n\n`)
                );
              } else if (parsed.type === "message_stop") {
                controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
              }
            } catch (e) {
              console.error("Error parsing Anthropic response:", e);
            }
          }
        }
      }
    });

    return new Response(response.body?.pipeThrough(transformStream), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-claude error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

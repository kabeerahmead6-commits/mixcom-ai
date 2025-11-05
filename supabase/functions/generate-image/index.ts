import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, imageUrl, options = {} } = await req.json();
    
    // Allow empty prompt if image is provided (for image analysis/editing)
    const hasImage = imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0;
    const hasPrompt = prompt && typeof prompt === 'string' && prompt.trim().length > 0;
    
    if (!hasPrompt && !hasImage) {
      return new Response(
        JSON.stringify({ error: "Either prompt or image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Enhance prompt with advanced options
    let finalPrompt = hasPrompt ? prompt : "Analyze and describe this image in detail";
    
    if (options && hasPrompt) {
      const styleEnhancements: Record<string, string> = {
        realistic: "ultra-realistic, photorealistic, high detail photography, professional lighting",
        artistic: "artistic painting style, masterful brushwork, vibrant colors, gallery-worthy composition",
        anime: "anime art style, manga inspired, vibrant colors, detailed linework, studio quality",
        "3d": "3D rendered, ray-traced lighting, physically based materials, octane render, unreal engine quality",
        cinematic: "cinematic composition, dramatic lighting, film grain, movie quality, epic scene",
        abstract: "abstract art, creative interpretation, bold colors, unique perspective",
        minimalist: "minimalist design, clean lines, simple composition, elegant simplicity",
        watercolor: "watercolor painting style, soft blends, artistic brush strokes, paper texture",
        digital: "digital art, modern illustration, clean vector style, polished finish",
        fantasy: "fantasy art style, magical atmosphere, imaginative details, ethereal lighting"
      };

      const qualityEnhancements: Record<string, string> = {
        standard: "good quality",
        high: "high detail, intricate details, sharp focus, high resolution",
        ultra: "ultra high quality, 8K resolution, maximum detail, professional grade, award-winning"
      };

      const aspectRatioHints: Record<string, string> = {
        "1:1": "square format composition",
        "16:9": "wide landscape format, cinematic framing",
        "9:16": "vertical portrait format",
        "4:3": "classic photograph composition",
        "21:9": "ultra-wide cinematic format"
      };

      let enhancedPrompt = finalPrompt;
      
      if (options.style && options.style !== "none" && styleEnhancements[options.style]) {
        enhancedPrompt = `${enhancedPrompt}, ${styleEnhancements[options.style]}`;
      }
      
      if (options.quality && qualityEnhancements[options.quality]) {
        enhancedPrompt = `${enhancedPrompt}, ${qualityEnhancements[options.quality]}`;
      }
      
      if (options.aspectRatio && aspectRatioHints[options.aspectRatio]) {
        enhancedPrompt = `${enhancedPrompt}, ${aspectRatioHints[options.aspectRatio]}`;
      }
      
      finalPrompt = enhancedPrompt;
      console.log("Enhanced prompt:", finalPrompt);
    }

    if (hasPrompt && prompt.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Prompt too long (max 5000 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Processing image request with prompt:", finalPrompt.substring(0, 100) + "...");
    console.log("Has input image:", !!imageUrl);

    // Build message content
    let messageContent: any;
    if (imageUrl) {
      // Image editing/analysis mode
      messageContent = [
        {
          type: "text",
          text: finalPrompt
        },
        {
          type: "image_url",
          image_url: {
            url: imageUrl
          }
        }
      ];
    } else {
      // Image generation mode
      messageContent = finalPrompt;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ],
        modalities: ["image", "text"],
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to generate image", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI Gateway response received");
    
    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textContent = data.choices?.[0]?.message?.content;
    
    // Return text content if image analysis was requested but no new image generated
    if (!generatedImageUrl && textContent && imageUrl) {
      console.log("Image analysis returned (no new image generated)");
      return new Response(
        JSON.stringify({ content: textContent, isAnalysis: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!generatedImageUrl) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      throw new Error("No image generated");
    }

    return new Response(
      JSON.stringify({ image: generatedImageUrl, content: textContent || "Image generated successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

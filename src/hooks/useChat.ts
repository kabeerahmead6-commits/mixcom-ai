import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  uploadedFiles?: File[];
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = useCallback(async (content: string, model: string = "google/gemini-2.5-flash", files?: File[]) => {
    const userMessage: Message = { role: "user", content, uploadedFiles: files };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Check if user wants to generate/edit an image
    const imageKeywords = /\b(generate|create|make|draw|show me|give me|edit|modify|change).*(image|picture|photo|pic|illustration|artwork)\b|\b(image|picture|photo|pic|illustration|artwork).*(of|for|with|about)\b/i;
    const isImageRequest = imageKeywords.test(content.toLowerCase()) || (files && files.length > 0);
    const hasImageFile = files && files.length > 0 && files[0].type.startsWith('image/');

    // Handle image generation/editing
    if ((isImageRequest || hasImageFile) && model === "google/gemini-2.5-flash-image-preview") {
      try {
        let imageBase64: string | undefined;
        
        // Convert uploaded image to base64 if present
        if (hasImageFile) {
          const file = files[0];
          const reader = new FileReader();
          imageBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            prompt: content,
            imageUrl: imageBase64
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to generate image");
        }

        const data = await response.json();
        
        // Handle both image generation and analysis responses
        if (data.isAnalysis) {
          // Text-only analysis response
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.content || "Image analyzed successfully.",
            },
          ]);
        } else {
          // Image generation response
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.content || "Here's your generated image:",
              imageUrl: data.imageUrl,
            },
          ]);
        }
        setIsLoading(false);
        return;
      } catch (error) {
        console.error("Image generation error:", error);
        toast({
          title: "Image Generation Failed",
          description: error instanceof Error ? error.message : "Failed to generate image",
          variant: "destructive",
        });
        setMessages((prev) => prev.slice(0, -1)); // Remove user message
        setIsLoading(false);
        return;
      }
    }

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      // Determine which endpoint to use based on the model
      const isClaude = model.startsWith("claude-");
      const endpoint = isClaude ? "chat-claude" : "chat";

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage], model }),
      });

      if (!response.ok || !response.body) {
        if (response.status === 429) {
          toast({
            title: "Rate Limit",
            description: "Too many requests. Please wait a moment.",
            variant: "destructive",
          });
        } else if (response.status === 402) {
          toast({
            title: "Credits Required",
            description: isClaude 
              ? "Your Anthropic API credits are depleted. Please add credits at console.anthropic.com"
              : "Please add credits to continue.",
            variant: "destructive",
          });
        } else if (response.status === 401) {
          toast({
            title: "Authentication Error",
            description: isClaude 
              ? "Invalid Anthropic API key. Please check your credentials."
              : "Authentication failed.",
            variant: "destructive",
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast({
            title: "Error",
            description: errorData.error || "Failed to connect to AI service.",
            variant: "destructive",
          });
        }
        setIsLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;

        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [messages, toast]);

  return { messages, sendMessage, isLoading };
};

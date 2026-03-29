import { useState, useCallback, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  uploadedFiles?: File[];
}

export interface ImageOptions {
  style: string;
  aspectRatio: string;
  quality: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthesisRef.current = new SpeechSynthesisUtterance();
      speechSynthesisRef.current.lang = 'en-US';
      speechSynthesisRef.current.rate = 1.0;
      speechSynthesisRef.current.pitch = 1.0;
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.text = text;
      window.speechSynthesis.speak(speechSynthesisRef.current);
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled(prev => {
      const newState = !prev;
      if (!newState) window.speechSynthesis.cancel();
      return newState;
    });
  };

  const { toast } = useToast();

  const getUserId = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  };

  const saveMessageToDb = async (sessionId: string, role: string, content: string, imageUrl?: string) => {
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role,
      content,
      image_url: imageUrl || null,
    });
  };

  const createSession = async (firstMessage: string, model: string): Promise<string | null> => {
    const userId = await getUserId();
    if (!userId) return null;

    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId, title, model })
      .select("id")
      .single();

    if (error || !data) return null;
    setRefreshTrigger(prev => prev + 1);
    return data.id;
  };

  const loadSession = async (sessionId: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const loaded: Message[] = data.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        imageUrl: m.image_url || undefined,
      }));
      setMessages(loaded);
      setActiveSessionId(sessionId);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setActiveSessionId(null);
  };

  const sendMessage = useCallback(async (content: string, model: string = "google/gemini-2.5-flash", files?: File[], imageOptions?: ImageOptions) => {
    const userMessage: Message = { role: "user", content, uploadedFiles: files };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Ensure session exists
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession(content, model);
      if (sessionId) setActiveSessionId(sessionId);
    }

    // Save user message
    if (sessionId) {
      await saveMessageToDb(sessionId, "user", content);
    }

    const imageKeywords = /\b(generate|create|make|draw|show me|give me|edit|modify|change).*(image|picture|photo|pic|illustration|artwork)\b|\b(image|picture|photo|pic|illustration|artwork).*(of|for|with|about)\b/i;
    const isImageRequest = imageKeywords.test(content.toLowerCase()) || (files && files.length > 0);
    const hasImageFile = files && files.length > 0 && files[0].type.startsWith('image/');

    if ((isImageRequest || hasImageFile) && model === "google/gemini-2.5-flash-image") {
      try {
        let imageBase64: string | undefined;
        if (hasImageFile) {
          const file = files[0];
          const reader = new FileReader();
          imageBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
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
          body: JSON.stringify({ prompt: content, imageUrl: imageBase64, options: imageOptions }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to generate image");
        }

        const data = await response.json();
        
        if (data.isAnalysis) {
          const analysisContent = data.content || "Image analyzed successfully.";
          setMessages((prev) => [...prev, { role: "assistant", content: analysisContent }]);
          if (sessionId) await saveMessageToDb(sessionId, "assistant", analysisContent);
          speakText(analysisContent);
        } else {
          const imageContent = data.content || "Here's your generated image:";
          setMessages((prev) => [...prev, { role: "assistant", content: imageContent, imageUrl: data.image }]);
          if (sessionId) await saveMessageToDb(sessionId, "assistant", imageContent, data.image);
          speakText(imageContent);
        }
        setIsLoading(false);
        if (sessionId) await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
        return;
      } catch (error) {
        console.error("Image generation error:", error);
        toast({ title: "Image Generation Failed", description: error instanceof Error ? error.message : "Failed to generate image", variant: "destructive" });
        setMessages((prev) => prev.slice(0, -1));
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
          toast({ title: "Rate Limit", description: "Too many requests. Please wait a moment.", variant: "destructive" });
        } else if (response.status === 402) {
          toast({ title: "Credits Required", description: isClaude ? "Your Anthropic API credits are depleted." : "Please add credits to continue.", variant: "destructive" });
        } else if (response.status === 401) {
          toast({ title: "Authentication Error", description: isClaude ? "Invalid Anthropic API key." : "Authentication failed.", variant: "destructive" });
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast({ title: "Error", description: errorData.error || "Failed to connect to AI service.", variant: "destructive" });
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

      // Save assistant response
      if (sessionId && assistantContent) {
        await saveMessageToDb(sessionId, "assistant", assistantContent);
        await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
      }

      if (assistantContent) speakText(assistantContent);
    } catch (error) {
      console.error("Chat error:", error);
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
      setIsLoading(false);
    }
  }, [messages, toast, voiceEnabled, activeSessionId]);

  return { messages, sendMessage, isLoading, voiceEnabled, toggleVoice, activeSessionId, loadSession, startNewChat, refreshTrigger };
};

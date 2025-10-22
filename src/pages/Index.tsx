import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { StarterPrompts } from "@/components/StarterPrompts";
import { UserMenu } from "@/components/UserMenu";
import { useChat } from "@/hooks/useChat";
import { Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

const Index = () => {
  const { messages, sendMessage, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="MìXCOM Ai Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-bold gradient-text">MìXCOM Ai</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
              <div className="space-y-4 text-center">
                <h2 className="text-4xl font-bold gradient-text">Hello! How can I help you today?</h2>
                <p className="text-muted-foreground text-lg">Choose a prompt below or ask me anything</p>
              </div>
              <StarterPrompts onSelect={sendMessage} disabled={isLoading} />
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage key={index} role={message.role} content={message.content} />
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="message-ai px-4 py-3 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </main>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
};

export default Index;

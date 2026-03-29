import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquarePlus, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface ChatSession {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

interface ChatHistoryProps {
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  refreshTrigger?: number;
}

export function ChatHistory({ activeSessionId, onSelectSession, onNewChat, refreshTrigger }: ChatHistoryProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) fetchSessions();
  }, [userId, refreshTrigger]);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (!error && data) setSessions(data);
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from("chat_sessions").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete chat");
      return;
    }
    toast.success("Chat deleted");
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) onNewChat();
  };

  if (!userId) return null;

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2 mb-2"
        onClick={onNewChat}
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span>New Chat</span>
      </Button>

      {sessions.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-1">No chat history yet</p>
      ) : (
        <ScrollArea className="max-h-[300px]">
          <div className="flex flex-col gap-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent transition-colors",
                  activeSessionId === session.id && "bg-accent"
                )}
                onClick={() => onSelectSession(session.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="truncate flex-1 text-foreground">{session.title}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete chat?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this chat and all its messages.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteSession(session.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

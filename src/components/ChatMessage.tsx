import { cn } from "@/lib/utils";
import { Sparkles, User } from "lucide-react";
import { LongPressImage } from "./LongPressImage";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  uploadedFiles?: File[];
}

export const ChatMessage = ({ role, content, imageUrl, uploadedFiles }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center flex-shrink-0 shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className={cn("max-w-[80%] rounded-2xl px-4 py-3 shadow-sm", isUser ? "message-user" : "message-ai")}>
        {uploadedFiles && uploadedFiles.length > 0 && (
          <div className="mb-3 space-y-2">
            {uploadedFiles.map((file, idx) => (
              file.type.startsWith('image/') ? (
                <img 
                  key={idx}
                  src={URL.createObjectURL(file)} 
                  alt="Uploaded" 
                  className="max-w-full h-auto rounded-lg"
                />
              ) : (
                <div key={idx} className="text-xs opacity-70">{file.name}</div>
              )
            ))}
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        {imageUrl && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <LongPressImage 
              src={imageUrl} 
              alt="Generated image"
              className="rounded-lg"
            />
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

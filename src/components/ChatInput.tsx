import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Image, Paperclip, X, Mic, MicOff, Volume2, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageGenerationOptions, ImageOptions } from "./ImageGenerationOptions";
import { useToast } from "@/hooks/use-toast";
interface ChatInputProps {
  onSend: (message: string, files?: File[], imageOptions?: ImageOptions) => void;
  disabled?: boolean;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
}

export const ChatInput = ({ onSend, disabled, voiceEnabled, onToggleVoice }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [imageOptions, setImageOptions] = useState<ImageOptions>({
    style: "none",
    aspectRatio: "1:1",
    quality: "standard",
  });
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    if ((!input.trim() && selectedFiles.length === 0) || disabled) return;
    onSend(
      input.trim(), 
      selectedFiles.length > 0 ? selectedFiles : undefined,
      showImageOptions ? imageOptions : undefined
    );
    setInput("");
    setSelectedFiles([]);
    setShowImageOptions(false);
  };

  const handleFileSelect = (files: FileList | null, type: 'image' | 'file') => {
    if (!files) return;
    const fileArray = Array.from(files);
    setSelectedFiles(prev => [...prev, ...fileArray]);
    
    // Show image options when image is uploaded
    if (type === 'image') {
      setShowImageOptions(true);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    // Auto-show image options if prompt contains image generation keywords
    const imageKeywords = /\b(generate|create|make|draw|show me|give me|image|picture|photo)\b/i;
    if (imageKeywords.test(input) && !showImageOptions) {
      setShowImageOptions(true);
    }
  }, [input]);

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInput(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice recognition error",
          description: "Please try again or check microphone permissions",
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Voice recognition not supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive"
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak now to convert speech to text"
      });
    }
  };

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm p-4">
      <div className="max-w-4xl mx-auto">
        {showImageOptions && (
          <ImageGenerationOptions
            options={imageOptions}
            onChange={setImageOptions}
            disabled={disabled}
          />
        )}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 text-sm"
              >
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="hover:bg-destructive/20 rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex gap-1">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files, 'image')}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files, 'file')}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-[52px] w-[52px] rounded-full"
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled}
            >
              <Image className="w-5 h-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-[52px] w-[52px] rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-[52px] w-[52px] rounded-full transition-colors",
                isListening && "bg-red-500/10 text-red-500 hover:bg-red-500/20"
              )}
              onClick={toggleVoiceRecognition}
              disabled={disabled}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          </div>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="resize-none min-h-[52px] max-h-[200px] rounded-2xl"
            disabled={disabled}
            rows={1}
          />
          <Button
            onClick={handleSubmit}
            disabled={(!input.trim() && selectedFiles.length === 0) || disabled}
            className={cn("rounded-full h-[52px] w-[52px] p-0 gradient-bg hover:opacity-90 transition-opacity")}
          >
            <Send className="w-5 h-5 text-white" />
          </Button>
        </div>
        
        {/* Voice AI Section */}
        <div className="mt-4 p-3 rounded-xl bg-secondary/30 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">NLP & Speech AI</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground/70">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Machine Learning
                </span>
                <span className="text-border">•</span>
                <span>Like Alexa, Google Assistant & Siri</span>
              </div>
            </div>
            {onToggleVoice && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleVoice}
                className={cn(
                  "h-8 px-3 text-xs gap-2 rounded-full transition-all",
                  voiceEnabled 
                    ? "bg-primary/10 text-primary hover:bg-primary/20" 
                    : "hover:bg-secondary"
                )}
              >
                <Volume2 className={cn("w-4 h-4", voiceEnabled && "animate-pulse")} />
                {voiceEnabled ? "Voice On" : "Voice Off"}
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2 sm:hidden">
            Powered by NLP, Machine Learning & Speech Recognition like Alexa, Google Assistant & Siri
          </p>
        </div>
      </div>
    </div>
  );
};

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { UserMenu } from "@/components/UserMenu";
import { toast } from "sonner";
import { Video, Loader2, Image, Paperclip, X, FileText } from "lucide-react";
import logo from "@/assets/logo.png";

const VideoAI = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setSelectedFiles(prev => [...prev, ...fileArray]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const generateVideoScript = async () => {
    if (!prompt.trim() && selectedFiles.length === 0) {
      toast.error("Please enter a prompt or upload files");
      return;
    }

    setIsGenerating(true);
    setGeneratedScript("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-script`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            prompt,
            files: selectedFiles.map(f => f.name),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please try again later.");
          return;
        }
        if (response.status === 402) {
          toast.error("Payment required. Please add credits.");
          return;
        }
        throw new Error(errorData.error || "Failed to generate script");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let scriptContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  scriptContent += content;
                  setGeneratedScript(scriptContent);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      toast.success("Video script generated!");
      setSelectedFiles([]);
      setPrompt("");
    } catch (error: unknown) {
      console.error("Error generating video script:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate script");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="MìXCOM" className="h-8 w-8" />
            <h1 className="text-xl font-semibold">MìXCOM AI - Video AI</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Video className="w-8 h-8 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Video AI Script Generator</h2>
                <p className="text-sm text-muted-foreground">
                  Generate professional video scripts and storyboards using AI
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Describe your video concept
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the video you want to create... (e.g., 'A 30-second promotional video for a coffee shop showing the brewing process')"
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>

              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
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

              <Button
                onClick={generateVideoScript}
                disabled={isGenerating || (!prompt.trim() && selectedFiles.length === 0)}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Script...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Video Script
                  </>
                )}
              </Button>
            </div>
          </Card>

          {generatedScript && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Generated Video Script</h3>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap bg-secondary/20 rounded-lg p-4 text-sm overflow-auto max-h-[600px]">
                  {generatedScript}
                </pre>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default VideoAI;

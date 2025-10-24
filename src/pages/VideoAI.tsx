import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { UserMenu } from "@/components/UserMenu";
import { toast } from "sonner";
import { Video, Loader2, Image, Paperclip, X } from "lucide-react";
import logo from "@/assets/logo.png";

const VideoAI = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setSelectedFiles(prev => [...prev, ...fileArray]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const generateVideo = async () => {
    if (!prompt.trim() && selectedFiles.length === 0) {
      toast.error("Please enter a prompt or upload files");
      return;
    }

    setIsGenerating(true);
    try {
      // Placeholder for Invideo API integration
      toast.info("Video generation feature coming soon with Invideo AI integration!");
      
      // Future implementation will call edge function for Invideo API
      // const { data, error } = await supabase.functions.invoke("generate-video", {
      //   body: { prompt, files: selectedFiles.map(f => f.name) },
      // });

      setSelectedFiles([]);
      setPrompt("");
    } catch (error: any) {
      console.error("Error generating video:", error);
      toast.error("Failed to generate video");
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
            <h1 className="text-xl font-semibold">MìXCOM AI - Video Generation</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Video className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold">Video AI by Invideo</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Describe your video
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the video you want to generate..."
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
                onClick={generateVideo}
                disabled={isGenerating || (!prompt.trim() && selectedFiles.length === 0)}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Generate Video
                  </>
                )}
              </Button>
            </div>
          </Card>

          {generatedVideo && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Generated Video</h3>
              <div className="aspect-video bg-secondary/20 rounded-lg flex items-center justify-center">
                <video
                  src={generatedVideo}
                  controls
                  className="w-full h-full rounded-lg"
                />
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default VideoAI;

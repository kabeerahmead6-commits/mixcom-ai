import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { UserMenu } from "@/components/UserMenu";
import { LongPressImage } from "@/components/LongPressImage";
import { toast } from "sonner";
import { Sparkles, Loader2, Image, Paperclip, X } from "lucide-react";
import logo from "@/assets/logo.png";

const ImageGeneration = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
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

  const generateImage = async () => {
    if (!prompt.trim() && selectedFiles.length === 0) {
      toast.error("Please enter a prompt or upload files");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt, files: selectedFiles.map(f => f.name) },
      });

      if (error) throw error;

      if (data?.image) {
        setGeneratedImage(data.image);
        
        // Save to database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: saveError } = await supabase
            .from("generated_images")
            .insert({
              user_id: user.id,
              prompt,
              image_url: data.image,
            });

          if (saveError) console.error("Error saving image:", saveError);
        }
        
        toast.success("Image generated successfully!");
        setSelectedFiles([]);
      }
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(error.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="MìXCOM Ai Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-bold gradient-text">Image Generation</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Describe the image you want to generate
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A beautiful sunset over mountains with a lake in the foreground..."
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
                onClick={generateImage}
                disabled={isGenerating || (!prompt.trim() && selectedFiles.length === 0)}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>
          </Card>

          {generatedImage && (
            <Card className="p-6">
              <LongPressImage
                src={generatedImage}
                alt="Generated image"
                className="w-full rounded-lg"
              />
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default ImageGeneration;
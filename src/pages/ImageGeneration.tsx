import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { UserMenu } from "@/components/UserMenu";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

const ImageGeneration = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const navigate = useNavigate();


  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt },
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
              <Button
                onClick={generateImage}
                disabled={isGenerating || !prompt.trim()}
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
              <img
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
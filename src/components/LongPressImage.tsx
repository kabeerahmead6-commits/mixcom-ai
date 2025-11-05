import { useState, useRef } from "react";
import { Download, Share2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LongPressImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const LongPressImage = ({ src, alt, className }: LongPressImageProps) => {
  const [showActions, setShowActions] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Image downloaded!");
      setShowActions(false);
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        const response = await fetch(src);
        const blob = await response.blob();
        const file = new File([blob], `image-${Date.now()}.png`, { type: blob.type });
        
        await navigator.share({
          files: [file],
          title: 'Generated Image',
        });
        setShowActions(false);
      } else {
        toast.error("Sharing is not supported on this device");
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error("Failed to share image");
      }
    }
  };

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={cn("max-w-full h-auto cursor-pointer select-none", className)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={() => setShowActions(true)}
      />
      
      <Sheet open={showActions} onOpenChange={setShowActions}>
        <SheetContent side="bottom" className="p-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold mb-2">Image Options</h3>
            <Button
              onClick={handleDownload}
              className="w-full justify-start"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Image
            </Button>
            <Button
              onClick={handleShare}
              className="w-full justify-start"
              variant="outline"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Image
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

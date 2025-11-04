import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Palette, Maximize, Sparkles } from "lucide-react";

export interface ImageOptions {
  style: string;
  aspectRatio: string;
  quality: string;
}

interface ImageGenerationOptionsProps {
  options: ImageOptions;
  onChange: (options: ImageOptions) => void;
  disabled?: boolean;
}

const styles = [
  { value: "none", label: "Default" },
  { value: "realistic", label: "Realistic Photo" },
  { value: "artistic", label: "Artistic/Painting" },
  { value: "anime", label: "Anime/Manga" },
  { value: "3d", label: "3D Render" },
  { value: "cinematic", label: "Cinematic" },
  { value: "abstract", label: "Abstract" },
  { value: "minimalist", label: "Minimalist" },
  { value: "watercolor", label: "Watercolor" },
  { value: "digital", label: "Digital Art" },
  { value: "fantasy", label: "Fantasy" },
];

const aspectRatios = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "4:3", label: "Standard (4:3)" },
  { value: "21:9", label: "Ultrawide (21:9)" },
];

const qualities = [
  { value: "standard", label: "Standard" },
  { value: "high", label: "High Detail" },
  { value: "ultra", label: "Ultra Quality" },
];

export const ImageGenerationOptions = ({ options, onChange, disabled }: ImageGenerationOptionsProps) => {
  return (
    <div className="bg-secondary/20 rounded-lg p-3 mb-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>Advanced Image Generation</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <Palette className="w-3 h-3" />
            Style
          </Label>
          <Select
            value={options.style}
            onValueChange={(value) => onChange({ ...options, style: value })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {styles.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  {style.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <Maximize className="w-3 h-3" />
            Aspect Ratio
          </Label>
          <Select
            value={options.aspectRatio}
            onValueChange={(value) => onChange({ ...options, aspectRatio: value })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aspectRatios.map((ratio) => (
                <SelectItem key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Quality
          </Label>
          <Select
            value={options.quality}
            onValueChange={(value) => onChange({ ...options, quality: value })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {qualities.map((quality) => (
                <SelectItem key={quality.value} value={quality.value}>
                  {quality.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

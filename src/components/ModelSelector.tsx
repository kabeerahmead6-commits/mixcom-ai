import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ModelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const models = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "openai/gpt-5-mini", label: "MiXCOM AI 0.5 Mini" },
  { value: "google/gemini-2.5-pro", label: "MiXCOM AI 2.5 Pro" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "google/gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image" },
  { value: "openai/gpt-5", label: "GPT-5" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano" },
];

export const ModelSelector = ({ value, onChange, disabled }: ModelSelectorProps) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/95 backdrop-blur-sm">
      <Brain className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Model:</span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-[200px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.value} value={model.value}>
              {model.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

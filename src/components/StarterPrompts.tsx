import { Button } from "@/components/ui/button";
import { Lightbulb, Code, Sparkles, Image } from "lucide-react";

interface StarterPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const prompts = [
  { icon: Lightbulb, text: "Explain quantum computing", color: "from-yellow-400 to-orange-500" },
  { icon: Code, text: "Write a Python function", color: "from-blue-400 to-cyan-500" },
  { icon: Sparkles, text: "Creative story idea", color: "from-purple-400 to-pink-500" },
  { icon: Image, text: "Plan a weekend trip", color: "from-green-400 to-emerald-500" },
];

export const StarterPrompts = ({ onSelect, disabled }: StarterPromptsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto p-4">
      {prompts.map((prompt, index) => {
        const Icon = prompt.icon;
        return (
          <Button
            key={index}
            variant="outline"
            className="h-auto py-4 px-5 text-left justify-start hover:border-primary/50 hover:bg-primary/5 transition-all group"
            onClick={() => onSelect(prompt.text)}
            disabled={disabled}
          >
            <div className={`bg-gradient-to-br ${prompt.color} p-2 rounded-lg mr-3 group-hover:scale-110 transition-transform`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm">{prompt.text}</span>
          </Button>
        );
      })}
    </div>
  );
};

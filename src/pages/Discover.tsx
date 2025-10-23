import { useNavigate } from "react-router-dom";
import { UserMenu } from "@/components/UserMenu";
import { Card } from "@/components/ui/card";
import { Compass, TrendingUp, Sparkles, Brain, Zap, Globe } from "lucide-react";
import logo from "@/assets/logo.png";

const Discover = () => {
  const navigate = useNavigate();

  const categories = [
    {
      icon: TrendingUp,
      title: "Trending Topics",
      description: "Explore what's popular right now",
      prompts: [
        "What are the latest AI breakthroughs in 2025?",
        "Explain quantum computing advances",
        "What's new in space exploration?"
      ]
    },
    {
      icon: Brain,
      title: "Learning & Education",
      description: "Expand your knowledge",
      prompts: [
        "Teach me about machine learning basics",
        "Explain blockchain in simple terms",
        "How does photosynthesis work?"
      ]
    },
    {
      icon: Zap,
      title: "Productivity",
      description: "Boost your efficiency",
      prompts: [
        "Help me create a study schedule",
        "Write a professional email template",
        "Plan a project timeline"
      ]
    },
    {
      icon: Globe,
      title: "News & Current Events",
      description: "Stay informed",
      prompts: [
        "Summarize today's tech news",
        "What's happening in global markets?",
        "Latest developments in renewable energy"
      ]
    }
  ];

  const handlePromptClick = (prompt: string) => {
    navigate("/", { state: { initialPrompt: prompt } });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="MìXCOM Ai Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-bold gradient-text">MìXCOM Ai</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Compass className="w-12 h-12 gradient-text" />
            </div>
            <h2 className="text-4xl font-bold gradient-text mb-4">Discover</h2>
            <p className="text-muted-foreground text-lg">
              Explore trending topics and get inspired with curated prompts
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.title} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {category.prompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePromptClick(prompt)}
                        className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent hover:border-primary/50 transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="text-sm">{prompt}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Discover;

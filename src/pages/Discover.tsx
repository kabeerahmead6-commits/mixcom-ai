import { useNavigate } from "react-router-dom";
import { UserMenu } from "@/components/UserMenu";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Compass, TrendingUp, Brain, Zap, Globe, Search, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
interface Topic {
  title: string;
  description: string;
  prompt: string;
  tags: string[];
}
interface CategoryData {
  icon: any;
  title: string;
  description: string;
  color: string;
  id: string;
}
const Discover = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [topics, setTopics] = useState<Record<string, Topic[]>>({});
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const categories: CategoryData[] = [{
    icon: TrendingUp,
    title: "Trending Now",
    description: "What's happening today",
    color: "from-purple-500 to-pink-500",
    id: "trending"
  }, {
    icon: Brain,
    title: "Deep Dive",
    description: "Learn something new",
    color: "from-blue-500 to-cyan-500",
    id: "learning"
  }, {
    icon: Zap,
    title: "Quick Answers",
    description: "Fast insights",
    color: "from-orange-500 to-yellow-500",
    id: "productivity"
  }, {
    icon: Globe,
    title: "World Today",
    description: "Global updates",
    color: "from-green-500 to-emerald-500",
    id: "news"
  }];
  const loadTopics = async (categoryId: string) => {
    if (topics[categoryId]) return; // Already loaded

    setLoadingCategory(categoryId);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("discover-topics", {
        body: {
          category: categoryId
        }
      });
      if (error) throw error;
      if (data?.topics) {
        setTopics(prev => ({
          ...prev,
          [categoryId]: data.topics
        }));
      }
    } catch (error: any) {
      console.error("Error loading topics:", error);
      toast.error("Failed to load topics. Please try again.");
    } finally {
      setLoadingCategory(null);
    }
  };
  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId);
      loadTopics(categoryId);
    }
  };
  const handlePromptClick = (prompt: string) => {
    navigate("/", {
      state: {
        initialPrompt: prompt
      }
    });
  };
  const filteredCategories = categories.filter(cat => cat.title.toLowerCase().includes(searchQuery.toLowerCase()) || cat.description.toLowerCase().includes(searchQuery.toLowerCase()));
  return <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="MìXCOM Ai Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-bold gradient-text">MìXCOM Ai | Discover</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Hero Section with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background border-b border-border">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="max-w-7xl mx-auto px-4 py-16 relative">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">MiXCOM AI-Powered Discovery</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold gradient-text">
                Explore & Discover
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Dive into trending topics, explore new ideas, and get instant insights powered by AI
              </p>
              
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto pt-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input type="text" placeholder="Search topics, categories..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 h-14 text-lg bg-card border-2 focus:border-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="space-y-8">
            {filteredCategories.map(category => {
            const Icon = category.icon;
            const isExpanded = selectedCategory === category.id;
            const isLoading = loadingCategory === category.id;
            const categoryTopics = topics[category.id];
            return <Card key={category.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20">
                  {/* Category Header */}
                  <button onClick={() => handleCategoryClick(category.id)} className="w-full p-6 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-2xl font-bold mb-1">{category.title}</h3>
                        <p className="text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                      <ArrowRight className={`w-6 h-6 text-muted-foreground group-hover:text-primary transition-all ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* Expanded Topics */}
                  {isExpanded && categoryTopics && <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryTopics.map((topic, idx) => <div key={idx} className="group p-5 rounded-xl bg-accent/50 hover:bg-accent border border-border hover:border-primary/30 transition-all cursor-pointer" onClick={() => handlePromptClick(topic.prompt)}>
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                  {topic.title}
                                </h4>
                                <Sparkles className="w-5 h-5 text-muted-foreground group-hover:text-primary flex-shrink-0 transition-colors" />
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {topic.description}
                              </p>
                              <div className="flex flex-wrap gap-2 pt-2">
                                {topic.tags.map((tag, tagIdx) => <Badge key={tagIdx} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>)}
                              </div>
                              <div className="pt-2 flex items-center gap-2 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>Ask this question</span>
                                <ArrowRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>)}
                      </div>
                    </div>}
                </Card>;
          })}
          </div>

          {/* Empty State */}
          {filteredCategories.length === 0 && <div className="text-center py-16">
              <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No categories found</h3>
              <p className="text-muted-foreground">Try a different search term</p>
            </div>}
        </div>
      </main>
    </div>;
};
export default Discover;
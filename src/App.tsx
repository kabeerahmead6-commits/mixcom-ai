import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ImageGeneration from "./pages/ImageGeneration";
import VideoAI from "./pages/VideoAI";
import Discover from "./pages/Discover";
import AISearchPro from "./pages/AISearchPro";
import CartoonMaker3D from "./pages/CartoonMaker3D";
import MixcomProPrompts from "./pages/MixcomProPrompts";
import ApiKeys from "./pages/ApiKeys";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/ai-search-pro" element={<AISearchPro />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/generate" element={<ImageGeneration />} />
          <Route path="/video-ai" element={<VideoAI />} />
          <Route path="/3d-cartoon-maker" element={<CartoonMaker3D />} />
          <Route path="/mixcom-pro-prompts" element={<MixcomProPrompts />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, Compass, Image, Video, Search, Box, Wand2, Settings, CreditCard, History } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/UserMenu";
import { ChatHistory } from "@/components/ChatHistory";

const menuItems = [
  { title: "Chat", url: "/", icon: MessageSquare },
  { title: "Discover", url: "/discover", icon: Compass },
  { title: "AI Search Pro", url: "/ai-search-pro", icon: Search },
  { title: "Image Generation", url: "/generate", icon: Image },
  { title: "Video AI", url: "/video-ai", icon: Video },
  { title: "3D Cartoon Maker", url: "/3d-cartoon-maker", icon: Box },
  { title: "MiXCOM Pro Prompts", url: "/mixcom-pro-prompts", icon: Wand2 },
  { title: "Pricing & Plans", url: "/pricing", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  activeSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  onNewChat?: () => void;
  refreshTrigger?: number;
}

export function AppSidebar({ activeSessionId, onSelectSession, onNewChat, refreshTrigger }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={location.pathname === item.url}
                    className="w-full"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Chat History
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2">
              <ChatHistory
                activeSessionId={activeSessionId ?? null}
                onSelectSession={onSelectSession ?? (() => {})}
                onNewChat={onNewChat ?? (() => { navigate("/"); })}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <div className="p-2">
          <UserMenu />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
